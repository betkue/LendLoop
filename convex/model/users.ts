import type { UserIdentity } from "convex/server";
import type { Doc } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import type { AppLocale, Role } from "../shared/constants";

/** Emails listed in the ADMIN_EMAILS deployment variable (comma-separated) get the admin role. */
export function roleForEmail(email: string): Role {
  const admins = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  return admins.includes(email.toLowerCase()) ? "admin" : "user";
}

/**
 * Returns the user's row, creating it on first sign-in from the Clerk identity.
 * On later sign-ins the profile fields are refreshed from Clerk; the role is
 * only ever raised to admin by ADMIN_EMAILS, never chosen by the client.
 */
export async function findOrCreateUser(
  ctx: MutationCtx,
  identity: UserIdentity,
  locale: AppLocale,
): Promise<Doc<"users">> {
  const email = identity.email ?? "";
  const name = identity.name ?? identity.nickname ?? email.split("@")[0] ?? "Neighbor";
  const existing = await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .unique();

  if (existing) {
    const role = existing.role === "admin" ? "admin" : roleForEmail(email);
    const patch = { name, email, imageUrl: identity.pictureUrl, role };
    if (
      existing.name !== patch.name ||
      existing.email !== patch.email ||
      existing.imageUrl !== patch.imageUrl ||
      existing.role !== patch.role
    ) {
      await ctx.db.patch(existing._id, patch);
    }
    return { ...existing, ...patch };
  }

  const id = await ctx.db.insert("users", {
    tokenIdentifier: identity.tokenIdentifier,
    name,
    email,
    imageUrl: identity.pictureUrl,
    role: roleForEmail(email),
    trustedLender: false,
    locale,
  });
  return (await ctx.db.get(id))!;
}
