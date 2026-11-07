"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useMemberQuery } from "@/hooks/use-member-query";
import type { Id } from "@/convex/_generated/dataModel";
import type { Category } from "@/convex/shared/constants";

/** Catalog items (public), optionally by category and/or name search; undefined while loading. */
export function useCatalog({ category, search }: { category?: Category | null; search?: string | null }) {
  return useQuery(api.tools.catalog, {
    ...(category && { category }),
    ...(search && { search }),
  });
}

/** Number of tools per category. */
export function useCategoryCounts() {
  return useQuery(api.tools.categoryCounts);
}

/** Live data of one tool; null when it no longer exists, undefined while loading. */
export function useTool(toolId: Id<"tools">) {
  return useMemberQuery(api.tools.get, { toolId });
}

/** The signed-in user's own listings; undefined while loading. */
export function useMyListings() {
  return useMemberQuery(api.tools.myListings);
}
