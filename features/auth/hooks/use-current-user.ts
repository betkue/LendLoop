"use client";

import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { CurrentUser } from "../types";

/**
 * The signed-in user's profile from Convex.
 * `isLoading` stays true until Clerk and Convex agree on the session and the
 * user row exists (created by useEnsureUser).
 */
export function useCurrentUser(): { user: CurrentUser | null; isLoading: boolean; isAdmin: boolean } {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const user = useQuery(api.users.me, isAuthenticated ? {} : "skip");
  return {
    user: user ?? null,
    isLoading: authLoading || (isAuthenticated && !user),
    isAdmin: user?.role === "admin",
  };
}
