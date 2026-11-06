import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import type { OUTBOX_EVENT_TYPES } from "../shared/validators";

export type OutboxEventType = (typeof OUTBOX_EVENT_TYPES)[number];

/**
 * Records a loan event in the outbox, in the same transaction as the change
 * that caused it: if the mutation commits, the event will be delivered; if it
 * fails, nothing is sent. Delivery to n8n is handled by outbox.dispatch.
 * The row holds no personal data, only the loan id.
 */
export async function enqueueEvent(ctx: MutationCtx, type: OutboxEventType, loanId: Id<"loans">) {
  const eventId = `${type}:${loanId}:${crypto.randomUUID()}`;
  await ctx.db.insert("outbox", {
    eventId,
    type,
    loanId,
    status: "pending",
    attempts: 0,
    nextAttemptAt: Date.now(),
  });
  return eventId;
}
