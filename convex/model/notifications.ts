import type { Doc } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import type { OutboxEventType } from "./outbox";

/** Who is told about each event: requests concern the owner, decisions the borrower. */
const RECIPIENT: Record<OutboxEventType, "owner" | "borrower"> = {
  "loan.requested": "owner",
  "loan.cancelled": "owner",
  "loan.approved": "borrower",
  "loan.declined": "borrower",
  "loan.returned": "borrower",
};

export type Recipient = { firstName: string; email: string; locale: Doc<"users">["locale"] };

function toRecipient(user: Doc<"users">): Recipient {
  return { firstName: user.name.split(" ")[0] ?? user.name, email: user.email, locale: user.locale };
}

/**
 * The message sent to n8n for an outbox event, built at send time so the
 * outbox never stores personal data. Only what the email needs is included:
 * first names, the recipient's email and language, the tool name and dates.
 */
export async function buildEventPayload(ctx: QueryCtx, event: Doc<"outbox">) {
  const loan = await ctx.db.get(event.loanId);
  if (!loan) return null;
  const [owner, borrower] = await Promise.all([ctx.db.get(loan.ownerId), ctx.db.get(loan.borrowerId)]);
  if (!owner || !borrower) return null;

  const recipientIsOwner = RECIPIENT[event.type] === "owner";
  const recipient = recipientIsOwner ? owner : borrower;
  const otherParty = recipientIsOwner ? borrower : owner;

  return {
    eventId: event.eventId,
    type: event.type,
    occurredAt: event._creationTime,
    loan: {
      id: loan._id,
      toolName: loan.toolName,
      startDate: loan.startDate,
      endDate: loan.endDate,
    },
    recipient: toRecipient(recipient),
    otherPartyFirstName: otherParty.name.split(" ")[0] ?? otherParty.name,
  };
}

export type EventPayload = NonNullable<Awaited<ReturnType<typeof buildEventPayload>>>;

export { toRecipient };
