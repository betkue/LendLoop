import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { api, internal } from "../_generated/api";
import { verify } from "../lib/hmac";
import { addDays, today } from "../shared/dates";
import { sampleTool, setupTest, signIn } from "../../test/convex-setup";

const SECRET = "convex-to-n8n";

beforeEach(() => {
  vi.stubEnv("N8N_NOTIFY_WEBHOOK_URL", "http://n8n.test/webhook/lendloop");
  vi.stubEnv("HMAC_SECRET_CONVEX_TO_N8N", SECRET);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

async function requestALoan() {
  const t = setupTest();
  const awa = await signIn(t, "Awa");
  const marc = await signIn(t, "Marc");
  const toolId = await awa.asUser.mutation(api.tools.create, sampleTool);
  const loanId = await marc.asUser.mutation(api.loans.request, {
    toolId,
    startDate: addDays(today(), 1),
    endDate: addDays(today(), 2),
  });
  return { t, loanId };
}

describe("outbox delivery", () => {
  test("sends a signed, minimal payload to the owner and marks it sent", async () => {
    const { t } = await requestALoan();
    const fetchMock = vi.fn(async () => new Response("ok", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await t.action(internal.outbox.dispatch, {});

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    const body = init.body as string;
    expect(await verify(SECRET, body, headers["X-LendLoop-Timestamp"], headers["X-LendLoop-Signature"])).toEqual({
      ok: true,
    });
    const payload = JSON.parse(body);
    expect(payload).toMatchObject({
      type: "loan.requested",
      recipient: { firstName: "Awa", email: "awa@example.com", locale: "en" },
      otherPartyFirstName: "Marc",
      loan: { toolName: sampleTool.name },
    });

    const [event] = await t.run((ctx) => ctx.db.query("outbox").collect());
    expect(event.status).toBe("sent");
    // The outbox row itself never stores personal data.
    expect(JSON.stringify(event)).not.toContain("@example.com");
  });

  test("retries with backoff, then gives up after 5 attempts and records the failure", async () => {
    const { t, loanId } = await requestALoan();
    vi.stubGlobal("fetch", vi.fn(async () => new Response("down", { status: 503 })));

    for (let attempt = 1; attempt <= 5; attempt++) {
      // Make the event due again, as time passing would.
      await t.run(async (ctx) => {
        const [event] = await ctx.db.query("outbox").collect();
        await ctx.db.patch(event._id, { nextAttemptAt: 0 });
      });
      await t.action(internal.outbox.dispatch, {});
    }

    const [event] = await t.run((ctx) => ctx.db.query("outbox").collect());
    expect(event).toMatchObject({ status: "failed", attempts: 5, lastError: "HTTP 503" });
    const history = await t.run((ctx) =>
      ctx.db
        .query("automationEvents")
        .withIndex("by_loan", (q) => q.eq("loanId", loanId))
        .collect(),
    );
    expect(history.map((entry) => entry.type)).toEqual(["automation_failed"]);
  });
});
