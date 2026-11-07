// @vitest-environment node
// Runs the actual n8n Code node sources (n8n/code/*.js) against the Convex
// signing code, to prove both sides agree on the HMAC format in both directions.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { sign, verify } from "../lib/hmac";

const require = createRequire(import.meta.url);
const CODE_DIR = join(import.meta.dirname, "..", "..", "n8n", "code");
const source = (name: string) => readFileSync(join(CODE_DIR, `${name}.js`), "utf8");

const env = { HMAC_SECRET_CONVEX_TO_N8N: "convex-to-n8n", HMAC_SECRET_N8N_TO_CONVEX: "n8n-to-convex" };

type Item = { json: Record<string, unknown>; binary?: Record<string, unknown> };

/** Executes a Code node body the way n8n does, with the globals it relies on. */
async function runCodeNode(
  code: string,
  { input = [], nodes = {}, staticData = {} }: { input?: Item[]; nodes?: Record<string, Item[]>; staticData?: Record<string, unknown> },
) {
  const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;
  const fn = new AsyncFunction("$input", "$env", "$", "$getWorkflowStaticData", "require", code);
  const $input = { first: () => input[0], all: () => input };
  const $ = (name: string) => ({ first: () => nodes[name][0], all: () => nodes[name] });
  return (await fn.call(
    { helpers: { getBinaryDataBuffer: async () => Buffer.from("") } },
    $input,
    env,
    $,
    () => staticData,
    require,
  )) as Item[];
}

const event = {
  eventId: "loan.requested:abc:1",
  type: "loan.requested",
  occurredAt: 1731000000000.5,
  loan: { id: "abc", toolName: "Perceuse", startDate: "2026-11-10", endDate: "2026-11-12" },
  recipient: { firstName: "Awa", email: "awa@example.com", locale: "fr" },
  otherPartyFirstName: "Marc",
};

async function webhookItem(body: string, secret = env.HMAC_SECRET_CONVEX_TO_N8N): Promise<Item> {
  const { timestamp, signature } = await sign(secret, body);
  return {
    json: { headers: { "x-lendloop-timestamp": timestamp, "x-lendloop-signature": signature }, body: JSON.parse(body) },
  };
}

describe("n8n ↔ Convex signatures", () => {
  test("workflow 1 accepts what Convex signs and rejects tampering or another secret", async () => {
    const body = JSON.stringify(event);
    const [ok] = await runCodeNode(source("verify-webhook"), { input: [await webhookItem(body)] });
    expect(ok.json).toMatchObject({ valid: true, duplicate: false, event: { eventId: event.eventId } });

    const tampered = await webhookItem(body);
    (tampered.json.body as typeof event).loan.toolName = "Something else";
    const [bad] = await runCodeNode(source("verify-webhook"), { input: [tampered] });
    expect(bad.json).toEqual({ valid: false, reason: "invalid" });

    const [wrongSecret] = await runCodeNode(source("verify-webhook"), { input: [await webhookItem(body, "nope")] });
    expect(wrongSecret.json.valid).toBe(false);
  });

  test("workflow 1 flags events it already handled", async () => {
    const body = JSON.stringify(event);
    const staticData = { handledEventIds: [event.eventId] };
    const [item] = await runCodeNode(source("verify-webhook"), { input: [await webhookItem(body)], staticData });
    expect(item.json.duplicate).toBe(true);
  });

  test("the email is written in the recipient's language", async () => {
    const code = `${source("messages")}\n${source("compose-notification")}`;
    const [email] = await runCodeNode(code, { input: [{ json: { event } }] });
    expect(email.json).toMatchObject({ to: "awa@example.com", eventId: event.eventId, loanId: "abc" });
    expect(email.json.subject).toBe("Marc souhaite emprunter votre Perceuse");
    expect(String(email.json.text)).toContain("Bonjour Awa,");
  });

  test("Convex accepts the write-backs n8n signs", async () => {
    const staticData: Record<string, unknown> = {};
    const [notification] = await runCodeNode(source("sign-notification-result"), {
      nodes: { "Compose email": [{ json: { eventId: event.eventId, loanId: "abc" } }] },
      staticData,
    });
    const { body, timestamp, signature } = notification.json as Record<string, string>;
    expect(await verify(env.HMAC_SECRET_N8N_TO_CONVEX, body, timestamp, signature)).toEqual({ ok: true });
    expect(staticData.handledEventIds).toEqual([event.eventId]);

    const [request] = await runCodeNode(source("sign-due-request"), {});
    const get = request.json as Record<string, string>;
    expect(await verify(env.HMAC_SECRET_N8N_TO_CONVEX, "", get.timestamp, get.signature)).toEqual({ ok: true });
  });

  test("workflow 2 builds one reminder email per due loan", async () => {
    const reminders = [
      {
        eventId: "overdue_reminder:abc:2026-11-13",
        type: "overdue_reminder",
        loan: event.loan,
        recipient: { firstName: "Marc", email: "marc@example.com", locale: "de" },
        ownerFirstName: "Awa",
      },
    ];
    const code = `${source("messages")}\n${source("compose-reminders")}`;
    const items = await runCodeNode(code, { input: [{ json: { reminders } }] });
    expect(items).toHaveLength(1);
    expect(items[0].json.subject).toBe("Überfällig: bitte gib Perceuse zurück");

    const signed = await runCodeNode(source("sign-reminder-results"), { nodes: { "Compose reminders": items } });
    const { body, timestamp, signature } = signed[0].json as Record<string, string>;
    expect(JSON.parse(body)).toMatchObject({ type: "overdue_reminder", channel: "email" });
    expect(await verify(env.HMAC_SECRET_N8N_TO_CONVEX, body, timestamp, signature)).toEqual({ ok: true });
  });
});
