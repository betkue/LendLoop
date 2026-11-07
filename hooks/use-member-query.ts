"use client";

import { useConvexAuth, useQuery } from "convex/react";
import type { FunctionReference, FunctionReturnType, OptionalRestArgs } from "convex/server";
import { api } from "@/convex/_generated/api";

/**
 * useQuery for member-only functions. Waits until Convex has the Clerk token
 * and the user's row exists (created by useEnsureUser on first sign-in), so the
 * query never runs too early and throws UNAUTHENTICATED. Undefined while waiting.
 */
export function useMemberQuery<Query extends FunctionReference<"query">>(
  query: Query,
  ...args: OptionalRestArgs<Query>
): FunctionReturnType<Query> | undefined {
  const { isAuthenticated } = useConvexAuth();
  const me = useQuery(api.users.me, isAuthenticated ? {} : "skip");
  const queryArgs = (args[0] ?? {}) as Query["_args"];
  return useQuery(query as FunctionReference<"query">, me ? queryArgs : "skip");
}
