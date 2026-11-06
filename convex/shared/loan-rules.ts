import type { LoanStatus } from "./constants";
import { today, type Day } from "./dates";

/**
 * Allowed status changes. pending is the only open state; approved ends with
 * returned; declined, cancelled and returned are final.
 */
const TRANSITIONS: Record<LoanStatus, readonly LoanStatus[]> = {
  pending: ["approved", "declined", "cancelled"],
  approved: ["returned"],
  declined: [],
  cancelled: [],
  returned: [],
};

export function canTransition(from: LoanStatus, to: LoanStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

/** Overdue is never stored: an approved loan past its end date. */
export function isOverdue(loan: { status: LoanStatus; endDate: Day }, now: number = Date.now()): boolean {
  return loan.status === "approved" && loan.endDate < today(now);
}

/** Display status, adding the computed "overdue" state to the stored ones. */
export type DisplayStatus = LoanStatus | "overdue";

export function displayStatus(loan: { status: LoanStatus; endDate: Day }, now: number = Date.now()): DisplayStatus {
  return isOverdue(loan, now) ? "overdue" : loan.status;
}
