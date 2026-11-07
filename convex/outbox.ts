import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction, internalMutation } from "./_generated/server";
import { SIGNATURE_HEADER, TIMESTAMP_HEADER, sign } from "./lib/hmac";
import { buildEventPayload } from "./model/notifications";

const BATCH_SIZE = 20;
const MAX_ATTEMPTS = 5;
const LEASE_MS = 2 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 10_000;

/** Exponential backoff between delivery attempts: 30 s, 1 min, 2 min, 4 min… */
function backoff(attempts: number) {
  return 30_000 * 2 ** Math.max(0, attempts - 1);
}

/**
 * Takes the events due for delivery and leases them for two minutes, so a
 * concurrent dispatch (cron + immediate trigger) does not send them twice.
 * n8n also drops duplicate eventIds, as a second line of defense.
 */
export const claimDue = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const due = await ctx.db
      .query("outbox")
      .withIndex("by_status_nextAttempt", (q) => q.eq("status", "pending").lte("nextAttemptAt", now))
      .take(BATCH_SIZE);

    const claimed = [];
    for (const event of due) {
      const payload = await buildEventPayload(ctx, event);
      if (!payload) {
        // The loan or a user is gone: nothing left to notify.
        await ctx.db.patch(event._id, { status: "failed", lastError: "missing loan or user" });
        continue;
      }
      await ctx.db.patch(event._id, { nextAttemptAt: now + LEASE_MS });
      claimed.push({ outboxId: event._id, payload });
    }
    return claimed;
  },
});

export const markSent = internalMutation({
  args: { outboxId: v.id("outbox") },
  handler: async (ctx, { outboxId }) => {
    await ctx.db.patch(outboxId, { status: "sent", lastError: undefined });
  },
});

/** Schedules a retry, or gives up after MAX_ATTEMPTS and records the failure on the loan. */
export const markFailed = internalMutation({
  args: { outboxId: v.id("outbox"), error: v.string() },
  handler: async (ctx, { outboxId, error }) => {
    const event = await ctx.db.get(outboxId);
    if (!event) return;
    const attempts = event.attempts + 1;
    if (attempts >= MAX_ATTEMPTS) {
      await ctx.db.patch(outboxId, { status: "failed", attempts, lastError: error });
      await ctx.db.insert("automationEvents", {
        eventId: `failed:${event.eventId}`,
        loanId: event.loanId,
        type: "automation_failed",
        detail: `delivery failed after ${attempts} attempts`,
      });
      return;
    }
    await ctx.db.patch(outboxId, { attempts, lastError: error, nextAttemptAt: Date.now() + backoff(attempts) });
  },
});

/**
 * Sends due events to the n8n notification webhook, signed with
 * HMAC_SECRET_CONVEX_TO_N8N. Triggered right after each event and every
 * minute by the cron, so events queued while n8n was down are delivered later.
 */
export const dispatch = internalAction({
  args: {},
  handler: async (ctx) => {
    const url = process.env.N8N_NOTIFY_WEBHOOK_URL;
    const secret = process.env.HMAC_SECRET_CONVEX_TO_N8N;
    if (!url || !secret) {
      console.warn("outbox: N8N_NOTIFY_WEBHOOK_URL or HMAC_SECRET_CONVEX_TO_N8N not set; events stay queued");
      return;
    }

    const claimed = await ctx.runMutation(internal.outbox.claimDue, {});
    for (const { outboxId, payload } of claimed) {
      const body = JSON.stringify(payload);
      const { timestamp, signature } = await sign(secret, body);
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            [TIMESTAMP_HEADER]: timestamp,
            [SIGNATURE_HEADER]: signature,
          },
          body,
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
        if (response.ok) {
          await ctx.runMutation(internal.outbox.markSent, { outboxId });
        } else {
          await ctx.runMutation(internal.outbox.markFailed, { outboxId, error: `HTTP ${response.status}` });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await ctx.runMutation(internal.outbox.markFailed, { outboxId, error: message });
      }
    }
  },
});
