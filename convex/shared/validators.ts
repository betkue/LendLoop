import { v } from "convex/values";
import { CATEGORIES, CONDITIONS, LOAN_STATUSES, LOCALES, ROLES } from "./constants";

/** Builds a v.union of string literals from a readonly tuple of keys. */
function literals<const T extends readonly [string, string, ...string[]]>(values: T) {
  const [first, second, ...rest] = values;
  return v.union(v.literal(first), v.literal(second), ...rest.map((value) => v.literal(value))) as ReturnType<
    typeof v.union<[ReturnType<typeof v.literal<T[number]>>, ...ReturnType<typeof v.literal<T[number]>>[]]>
  >;
}

export const vLocale = literals(LOCALES);
export const vRole = literals(ROLES);
export const vCategory = literals(CATEGORIES);
export const vCondition = literals(CONDITIONS);
export const vLoanStatus = literals(LOAN_STATUSES);

export const OUTBOX_EVENT_TYPES = [
  "loan.requested",
  "loan.approved",
  "loan.declined",
  "loan.cancelled",
  "loan.returned",
] as const;
export const vOutboxEventType = literals(OUTBOX_EVENT_TYPES);
export const vOutboxStatus = literals(["pending", "sent", "failed"] as const);

export const AUTOMATION_EVENT_TYPES = [
  "notification_sent",
  "overdue_reminder_sent",
  "due_tomorrow_reminder_sent",
  "automation_failed",
] as const;
export const vAutomationEventType = literals(AUTOMATION_EVENT_TYPES);
export const vChannel = literals(["email", "log"] as const);
