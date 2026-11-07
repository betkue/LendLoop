import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { Id } from "../_generated/dataModel";
import { sign } from "../lib/hmac";
import { addDays, today } from "../shared/dates";
import { sampleTool, setupTest, signIn } from "../../test/convex-setup";
import { api } from "../_generated/api";

const SECRET = "n8n-to-convex";

beforeEach(() => vi.stubEnv("HMAC_SECRET_N8N_TO_CONVEX", SECRET));
afterEach(() => vi.unstubAllEnvs());

async function signedHeaders(body: string, secret = SECRET, at = Date.now()) {
  const { timestamp, signature } = await sign(secret, body, at);
  return { "X-LendLoop-Timestamp": timestamp, "X-LendLoop-Signature": signature, "Content-Type": "application/json" };
}

/** Awa lends to Marc: one loan overdue since yesterday, one ending tomorrow. */
async function setup() {
  const t = setupTest();
  const awa = await signIn(t, "Awa");
  const marc = await signIn(t, "Marc");
  const toolId = await awa.asUser.mutation(api.tools.create, sampleTool);
  const insert = (startDate: string, endDate: string) =>
    t.run((ctx) =>
      ctx.db.insert("loans", {
        toolId,
        toolName: sampleTool.name,
        ownerId: awa.userId,
        borrowerId: marc.userId,
        startDate,
        endDate,
        status: "approved",
      }),
    );
  const overdueId = await insert(addDays(today(), -3), addDays(today(), -1));
  const dueTomorrowId = await insert(today(), addDays(today(), 1));
  return { t, overdueId, dueTomorrowId };
}

describe("n8n endpoints", () => {
  test("refuse unsigned, wrongly signed and replayed requests", async () => {
    const { t } = await setup();
    expect((await t.fetch("/n8n/due-reminders")).status).toBe(401);
    expect((await t.fetch("/n8n/due-reminders", { headers: await signedHeaders("", "wrong") })).status).toBe(401);
    const stale = await signedHeaders("", SECRET, Date.now() - 10 * 60 * 1000);
    const response = await t.fetch("/n8n/due-reminders", { headers: stale });
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ reason: "expired" });
  });

  test("list today's overdue and due-tomorrow reminders for the borrower", async () => {
    const { t, overdueId, dueTomorrowId } = await setup();
    const response = await t.fetch("/n8n/due-reminders", { headers: await signedHeaders("") });
    expect(response.status).toBe(200);
    const { reminders } = (await response.json()) as { reminders: { type: string; loan: { id: Id<"loans"> }; recipient: { firstName: string } }[] };
    expect(reminders.map((r) => [r.type, r.loan.id])).toEqual([
      ["overdue_reminder", overdueId],
      ["due_tomorrow_reminder", dueTomorrowId],
    ]);
    expect(reminders[0].recipient.firstName).toBe("Marc");
  });

  test("record a reminder once, even when n8n sends it twice", async () => {
    const { t, overdueId } = await setup();
    const body = JSON.stringify({
      eventId: `overdue_reminder:${overdueId}:${today()}`,
      loanId: overdueId,
      type: "overdue_reminder",
      channel: "email",
    });
    const send = async () =>
      (await t.fetch("/n8n/reminder-result", { method: "POST", body, headers: await signedHeaders(body) })).json();

    expect(await send()).toEqual({ status: "recorded" });
    expect(await send()).toEqual({ status: "duplicate" });

    // Once recorded, the overdue reminder is no longer due today.
    const { reminders } = (await (
      await t.fetch("/n8n/due-reminders", { headers: await signedHeaders("") })
    ).json()) as { reminders: { type: string }[] };
    expect(reminders.map((r) => r.type)).toEqual(["due_tomorrow_reminder"]);
  });

  test("reject malformed bodies", async () => {
    const { t } = await setup();
    const body = JSON.stringify({ eventId: "x", type: "something_else" });
    const response = await t.fetch("/n8n/reminder-result", { method: "POST", body, headers: await signedHeaders(body) });
    expect(response.status).toBe(400);
  });
});
