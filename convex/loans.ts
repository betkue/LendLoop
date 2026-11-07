import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { requireUser } from "./lib/auth";
import { appError } from "./lib/errors";
import { getLoanOrThrow, overlapsApprovedLoan, requestLoan, transitionLoan } from "./model/loans";
import { approvedLoans, imageUrl } from "./model/tools";
import { today } from "./shared/dates";

/** Loan row for the member views: tool snapshot, photo, the other party's first name. */
async function toLoanView(ctx: QueryCtx, loan: Doc<"loans">, otherPartyId: Doc<"users">["_id"]) {
  const tool = await ctx.db.get(loan.toolId);
  const other = await ctx.db.get(otherPartyId);
  return {
    _id: loan._id,
    toolId: loan.toolId,
    toolName: loan.toolName,
    toolExists: tool !== null,
    category: tool?.category ?? null,
    imageUrl: tool ? await imageUrl(ctx, tool.imageId) : null,
    startDate: loan.startDate,
    endDate: loan.endDate,
    status: loan.status,
    otherPartyName: other?.name.split(" ")[0] ?? "",
    createdAt: loan._creationTime,
    decidedAt: loan.decidedAt ?? null,
    returnedAt: loan.returnedAt ?? null,
  };
}

/** Ask to borrow a tool for an inclusive date range. */
export const request = mutation({
  args: { toolId: v.id("tools"), startDate: v.string(), endDate: v.string() },
  handler: async (ctx, { toolId, startDate, endDate }) => {
    const user = await requireUser(ctx);
    return await requestLoan(ctx, user, toolId, { startDate, endDate });
  },
});

/** The borrower withdraws a request that is still pending. */
export const cancel = mutation({
  args: { loanId: v.id("loans") },
  handler: async (ctx, { loanId }) => {
    const user = await requireUser(ctx);
    const loan = await getLoanOrThrow(ctx, loanId);
    if (loan.borrowerId !== user._id) throw appError("FORBIDDEN");
    await transitionLoan(ctx, loan, "cancelled");
  },
});

/** Owner-only decisions on a request, and the return of the tool. */
function ownerAction(to: "approved" | "declined" | "returned") {
  return mutation({
    args: { loanId: v.id("loans") },
    handler: async (ctx, { loanId }) => {
      const user = await requireUser(ctx);
      const loan = await getLoanOrThrow(ctx, loanId);
      if (loan.ownerId !== user._id) throw appError("FORBIDDEN");
      await transitionLoan(ctx, loan, to);
    },
  });
}

export const approve = ownerAction("approved");
export const decline = ownerAction("declined");
export const markReturned = ownerAction("returned");

/** "My requests": loans the signed-in user asked for, newest first. */
export const myRequests = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const loans = await ctx.db
      .query("loans")
      .withIndex("by_borrower", (q) => q.eq("borrowerId", user._id))
      .order("desc")
      .collect();
    return await Promise.all(loans.map((loan) => toLoanView(ctx, loan, loan.ownerId)));
  },
});

/**
 * "Incoming requests": loans on the user's tools. Pending requests say whether
 * approving them would overlap an approved loan, so the UI can warn first.
 */
export const incoming = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const byStatus = async (status: Doc<"loans">["status"]) =>
      await ctx.db
        .query("loans")
        .withIndex("by_owner_status", (q) => q.eq("ownerId", user._id).eq("status", status))
        .order("desc")
        .collect();
    const [pending, approved, closed] = await Promise.all([
      byStatus("pending"),
      byStatus("approved"),
      Promise.all([byStatus("returned"), byStatus("declined"), byStatus("cancelled")]).then((lists) =>
        lists.flat().sort((a, b) => b._creationTime - a._creationTime).slice(0, 20),
      ),
    ]);
    return await Promise.all(
      [...pending, ...approved, ...closed].map(async (loan) => ({
        ...(await toLoanView(ctx, loan, loan.borrowerId)),
        overlapsApproved:
          loan.status === "pending" ? await overlapsApprovedLoan(ctx, loan.toolId, loan) : false,
      })),
    );
  },
});

/** Approved periods of a tool from today on, to grey them out in the calendar. */
export const bookedRanges = query({
  args: { toolId: v.id("tools") },
  handler: async (ctx, { toolId }) => {
    await requireUser(ctx);
    const day = today();
    return (await approvedLoans(ctx, toolId))
      .filter((loan) => loan.endDate >= day)
      .map((loan) => ({ startDate: loan.startDate, endDate: loan.endDate }));
  },
});

/** Automation history of a loan, visible to its borrower and owner only. */
export const activity = query({
  args: { loanId: v.id("loans") },
  handler: async (ctx, { loanId }) => {
    const user = await requireUser(ctx);
    const loan = await getLoanOrThrow(ctx, loanId);
    if (loan.borrowerId !== user._id && loan.ownerId !== user._id && user.role !== "admin") {
      throw appError("FORBIDDEN");
    }
    const events = await ctx.db
      .query("automationEvents")
      .withIndex("by_loan", (q) => q.eq("loanId", loanId))
      .collect();
    return events
      .map((event) => ({ _id: event._id, type: event.type, at: event.occurredAt ?? event._creationTime }))
      .sort((a, b) => b.at - a.at)
      .slice(0, 10);
  },
});
