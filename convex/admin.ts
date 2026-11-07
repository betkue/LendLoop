import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./lib/auth";
import { appError } from "./lib/errors";
import { deleteTool } from "./model/tools";
import { vLoanStatus } from "./shared/validators";

/** Every loan, newest first, optionally by stored status (admin only). */
export const allLoans = query({
  args: { status: v.optional(vLoanStatus) },
  handler: async (ctx, { status }) => {
    await requireAdmin(ctx);
    const loans = status
      ? await ctx.db
          .query("loans")
          .filter((q) => q.eq(q.field("status"), status))
          .order("desc")
          .collect()
      : await ctx.db.query("loans").order("desc").collect();

    return await Promise.all(
      loans.map(async (loan) => {
        const [owner, borrower, tool] = await Promise.all([
          ctx.db.get(loan.ownerId),
          ctx.db.get(loan.borrowerId),
          ctx.db.get(loan.toolId),
        ]);
        return {
          _id: loan._id,
          toolId: loan.toolId,
          toolName: loan.toolName,
          toolExists: tool !== null,
          ownerName: owner?.name ?? "",
          borrowerName: borrower?.name ?? "",
          startDate: loan.startDate,
          endDate: loan.endDate,
          status: loan.status,
          createdAt: loan._creationTime,
        };
      }),
    );
  },
});

/** Members with their role, trusted flag and listing count (admin only). */
export const users = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const users = await ctx.db.query("users").collect();
    return await Promise.all(
      users
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(async (user) => ({
          _id: user._id,
          name: user.name,
          email: user.email,
          imageUrl: user.imageUrl ?? null,
          role: user.role,
          trustedLender: user.trustedLender,
          toolCount: (
            await ctx.db
              .query("tools")
              .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
              .collect()
          ).length,
        })),
    );
  },
});

/** Removes any listing (moderation). Same rules as an owner delete. */
export const removeTool = mutation({
  args: { toolId: v.id("tools") },
  handler: async (ctx, { toolId }) => {
    await requireAdmin(ctx);
    const tool = await ctx.db.get(toolId);
    if (!tool) throw appError("NOT_FOUND");
    await deleteTool(ctx, tool);
  },
});

/** Grants or removes the "Trusted Lender" badge; it confers no permission. */
export const setTrustedLender = mutation({
  args: { userId: v.id("users"), trusted: v.boolean() },
  handler: async (ctx, { userId, trusted }) => {
    await requireAdmin(ctx);
    const user = await ctx.db.get(userId);
    if (!user) throw appError("NOT_FOUND");
    await ctx.db.patch(userId, { trustedLender: trusted });
  },
});
