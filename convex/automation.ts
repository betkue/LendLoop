import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { toRecipient } from "./model/notifications";
import { addDays, today } from "./shared/dates";
import { vAutomationEventType, vChannel } from "./shared/validators";

type ReminderType = "overdue_reminder" | "due_tomorrow_reminder";

async function alreadyRecorded(ctx: QueryCtx, eventId: string) {
  return (
    (await ctx.db
      .query("automationEvents")
      .withIndex("by_eventId", (q) => q.eq("eventId", eventId))
      .first()) !== null
  );
}

async function toReminder(ctx: QueryCtx, loan: Doc<"loans">, type: ReminderType, day: string) {
  // One eventId per loan, type and day: n8n can resend it safely, and the
  // borrower gets at most one reminder of each kind per day.
  const eventId = `${type}:${loan._id}:${day}`;
  if (await alreadyRecorded(ctx, eventId)) return null;
  const [borrower, owner] = await Promise.all([ctx.db.get(loan.borrowerId), ctx.db.get(loan.ownerId)]);
  if (!borrower || !owner) return null;
  return {
    eventId,
    type,
    loan: { id: loan._id, toolName: loan.toolName, startDate: loan.startDate, endDate: loan.endDate },
    recipient: toRecipient(borrower),
    ownerFirstName: owner.name.split(" ")[0] ?? owner.name,
  };
}

/**
 * Today's reminders for n8n: approved loans past their end date (overdue) and
 * approved loans ending tomorrow. Reminders already sent today are left out.
 */
export const dueReminders = internalQuery({
  args: { now: v.number() },
  handler: async (ctx, { now }) => {
    const day = today(now);
    const tomorrow = addDays(day, 1);

    const overdue = await ctx.db
      .query("loans")
      .withIndex("by_status_endDate", (q) => q.eq("status", "approved").lt("endDate", day))
      .collect();
    const dueTomorrow = await ctx.db
      .query("loans")
      .withIndex("by_status_endDate", (q) => q.eq("status", "approved").eq("endDate", tomorrow))
      .collect();

    const reminders = [
      ...(await Promise.all(overdue.map((loan) => toReminder(ctx, loan, "overdue_reminder", day)))),
      ...(await Promise.all(dueTomorrow.map((loan) => toReminder(ctx, loan, "due_tomorrow_reminder", day)))),
    ];
    return reminders.filter((reminder) => reminder !== null);
  },
});

/**
 * Idempotent write-back from n8n: the same eventId recorded twice has a single
 * effect, so retries and replays inside the signature window are harmless.
 */
export const recordResult = internalMutation({
  args: {
    eventId: v.string(),
    loanId: v.string(),
    type: vAutomationEventType,
    channel: v.optional(vChannel),
    detail: v.optional(v.string()),
  },
  handler: async (ctx, { eventId, loanId, type, channel, detail }) => {
    const id = ctx.db.normalizeId("loans", loanId);
    if (!id || !(await ctx.db.get(id))) return { status: "unknown_loan" as const };
    if (await alreadyRecorded(ctx, eventId)) return { status: "duplicate" as const };
    await ctx.db.insert("automationEvents", { eventId, loanId: id, type, channel, detail: detail?.slice(0, 500) });
    return { status: "recorded" as const };
  },
});
