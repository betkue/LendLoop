import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { appError } from "../lib/errors";
import type { LoanStatus } from "../shared/constants";
import { isDay, rangesOverlap, today, type Day } from "../shared/dates";
import { canTransition } from "../shared/loanRules";
import { enqueueEvent, type OutboxEventType } from "./outbox";
import { approvedLoans, getToolOrThrow } from "./tools";

type Ctx = QueryCtx | MutationCtx;

export async function getLoanOrThrow(ctx: Ctx, loanId: Id<"loans">): Promise<Doc<"loans">> {
  const loan = await ctx.db.get(loanId);
  if (!loan) throw appError("NOT_FOUND");
  return loan;
}

/** Valid calendar days, end on or after start, start not in the past. */
export function assertValidRange(startDate: string, endDate: string, now = Date.now()): void {
  if (!isDay(startDate) || !isDay(endDate) || endDate < startDate || startDate < today(now)) {
    throw appError("INVALID_DATES");
  }
}

/** True when the range overlaps an approved loan of the tool (other than `exceptLoanId`). */
export async function overlapsApprovedLoan(
  ctx: Ctx,
  toolId: Id<"tools">,
  range: { startDate: Day; endDate: Day },
  exceptLoanId?: Id<"loans">,
): Promise<boolean> {
  const loans = await approvedLoans(ctx, toolId);
  return loans.some((loan) => loan._id !== exceptLoanId && rangesOverlap(loan, range));
}

/** Creates a pending request after checking dates, ownership and overlaps. */
export async function requestLoan(
  ctx: MutationCtx,
  borrower: Doc<"users">,
  toolId: Id<"tools">,
  range: { startDate: Day; endDate: Day },
): Promise<Id<"loans">> {
  assertValidRange(range.startDate, range.endDate);
  const tool = await getToolOrThrow(ctx, toolId);
  if (tool.ownerId === borrower._id) throw appError("OWN_TOOL");
  if (await overlapsApprovedLoan(ctx, toolId, range)) throw appError("DATES_OVERLAP");

  const loanId = await ctx.db.insert("loans", {
    toolId,
    toolName: tool.name,
    ownerId: tool.ownerId,
    borrowerId: borrower._id,
    startDate: range.startDate,
    endDate: range.endDate,
    status: "pending",
  });
  await enqueueEvent(ctx, "loan.requested", loanId);
  return loanId;
}

const EVENT_FOR_STATUS: Partial<Record<LoanStatus, OutboxEventType>> = {
  approved: "loan.approved",
  declined: "loan.declined",
  cancelled: "loan.cancelled",
  returned: "loan.returned",
};

/** Applies an allowed status change, timestamps it and queues the notification. */
export async function transitionLoan(ctx: MutationCtx, loan: Doc<"loans">, to: LoanStatus): Promise<void> {
  if (!canTransition(loan.status, to)) throw appError("INVALID_TRANSITION");
  if (to === "approved" && (await overlapsApprovedLoan(ctx, loan.toolId, loan, loan._id))) {
    throw appError("DATES_OVERLAP");
  }

  const now = Date.now();
  await ctx.db.patch(loan._id, {
    status: to,
    ...(to === "returned" ? { returnedAt: now } : { decidedAt: now }),
  });
  const event = EVENT_FOR_STATUS[to];
  if (event) await enqueueEvent(ctx, event, loan._id);
}
