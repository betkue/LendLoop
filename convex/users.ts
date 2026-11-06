import { mutation, query } from "./_generated/server";
import { getCurrentUser, requireUser } from "./lib/auth";
import { appError } from "./lib/errors";
import { findOrCreateUser } from "./model/users";
import { vLocale } from "./shared/validators";

/** Called once after sign-in: creates or refreshes the user's row. */
export const ensureUser = mutation({
  args: { locale: vLocale },
  handler: async (ctx, { locale }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw appError("UNAUTHENTICATED");
    const user = await findOrCreateUser(ctx, identity, locale);
    return user._id;
  },
});

/** The signed-in user's public profile, or null when signed out or not created yet. */
export const me = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;
    return {
      _id: user._id,
      name: user.name,
      imageUrl: user.imageUrl,
      role: user.role,
      trustedLender: user.trustedLender,
      locale: user.locale,
    };
  },
});

/** Stores the language used for this user's notifications. */
export const setLocale = mutation({
  args: { locale: vLocale },
  handler: async (ctx, { locale }) => {
    const user = await requireUser(ctx);
    if (user.locale !== locale) await ctx.db.patch(user._id, { locale });
  },
});
