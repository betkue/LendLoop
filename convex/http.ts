import { httpRouter } from "convex/server";
import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";
import { SIGNATURE_HEADER, TIMESTAMP_HEADER, verify } from "./lib/hmac";

/**
 * Endpoints called by n8n. Every request must be signed with
 * HMAC_SECRET_N8N_TO_CONVEX (see lib/hmac.ts): unsigned, tampered or replayed
 * requests (timestamp older than 5 minutes) get 401 before anything is read.
 */
const http = httpRouter();

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

/** Verifies the signature over the raw body; returns the body text or a 401 response. */
async function authenticate(request: Request): Promise<{ body: string } | { response: Response }> {
  const body = await request.text();
  const result = await verify(
    process.env.HMAC_SECRET_N8N_TO_CONVEX ?? "",
    body,
    request.headers.get(TIMESTAMP_HEADER),
    request.headers.get(SIGNATURE_HEADER),
  );
  if (!result.ok) return { response: json({ error: "unauthorized", reason: result.reason }, 401) };
  return { body };
}

function parseObject(body: string): Record<string, unknown> | null {
  try {
    const value: unknown = JSON.parse(body);
    return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

const isString = (value: unknown): value is string => typeof value === "string" && value.length > 0 && value.length <= 200;
const asChannel = (value: unknown) => (value === "email" || value === "log" ? value : undefined);

/** Workflow 2: overdue loans and loans ending tomorrow, not yet reminded today. */
http.route({
  path: "/n8n/due-reminders",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const auth = await authenticate(request);
    if ("response" in auth) return auth.response;
    const reminders = await ctx.runQuery(internal.automation.dueReminders, { now: Date.now() });
    return json({ reminders });
  }),
});

/** Workflow 2: a reminder was sent. Idempotent on eventId. */
http.route({
  path: "/n8n/reminder-result",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const auth = await authenticate(request);
    if ("response" in auth) return auth.response;
    const data = parseObject(auth.body);
    const type =
      data?.type === "overdue_reminder"
        ? "overdue_reminder_sent"
        : data?.type === "due_tomorrow_reminder"
          ? "due_tomorrow_reminder_sent"
          : null;
    if (!data || !type || !isString(data.eventId) || !isString(data.loanId)) {
      return json({ error: "invalid_body" }, 400);
    }
    const result = await ctx.runMutation(internal.automation.recordResult, {
      eventId: data.eventId,
      loanId: data.loanId,
      type,
      channel: asChannel(data.channel),
    });
    return json(result, result.status === "unknown_loan" ? 404 : 200);
  }),
});

/** Workflow 1: a request / decision notification was sent. Idempotent on eventId. */
http.route({
  path: "/n8n/notification-result",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const auth = await authenticate(request);
    if ("response" in auth) return auth.response;
    const data = parseObject(auth.body);
    if (!data || !isString(data.eventId) || !isString(data.loanId)) return json({ error: "invalid_body" }, 400);
    const result = await ctx.runMutation(internal.automation.recordResult, {
      eventId: data.eventId,
      loanId: data.loanId,
      type: "notification_sent",
      channel: asChannel(data.channel),
    });
    return json(result, result.status === "unknown_loan" ? 404 : 200);
  }),
});

/** Error workflow: a workflow failed after its retries. Recorded on the loan when known. */
http.route({
  path: "/n8n/automation-error",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const auth = await authenticate(request);
    if ("response" in auth) return auth.response;
    const data = parseObject(auth.body);
    if (!data || !isString(data.eventId)) return json({ error: "invalid_body" }, 400);
    const detail = [data.workflow, data.node, data.message].filter((part) => typeof part === "string").join(" · ");
    console.error("n8n automation error", detail);
    if (!isString(data.loanId)) return json({ status: "logged" });
    const result = await ctx.runMutation(internal.automation.recordResult, {
      eventId: data.eventId,
      loanId: data.loanId,
      type: "automation_failed",
      detail,
    });
    return json(result);
  }),
});

export default http;
