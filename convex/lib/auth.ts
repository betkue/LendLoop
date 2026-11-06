import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { appError } from "./errors";

type Ctx = QueryCtx | MutationCtx;

/** The signed-in user's row, or null when signed out or not created yet. */
export async function getCurrentUser(ctx: Ctx): Promise<Doc<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  return await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .unique();
}

/** Every protected function starts here: throws UNAUTHENTICATED when signed out. */
export async function requireUser(ctx: Ctx): Promise<Doc<"users">> {
  const user = await getCurrentUser(ctx);
  if (!user) throw appError("UNAUTHENTICATED");
  return user;
}

/** Throws FORBIDDEN unless the signed-in user owns the resource. */
export async function requireOwner(ctx: Ctx, ownerId: Id<"users">): Promise<Doc<"users">> {
  const user = await requireUser(ctx);
  if (user._id !== ownerId) throw appError("FORBIDDEN");
  return user;
}

/** Throws FORBIDDEN unless the signed-in user is an admin. */
export async function requireAdmin(ctx: Ctx): Promise<Doc<"users">> {
  const user = await requireUser(ctx);
  if (user.role !== "admin") throw appError("FORBIDDEN");
  return user;
}
