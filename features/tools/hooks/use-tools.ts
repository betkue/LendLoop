"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { Category } from "@/convex/shared/constants";

/** Live list of all tools, optionally filtered by category; undefined while loading. */
export function useTools(category: Category | null) {
  return useQuery(api.tools.list, category ? { category } : {});
}

/** Live data of one tool; null when it no longer exists, undefined while loading. */
export function useTool(toolId: Id<"tools">) {
  return useQuery(api.tools.get, { toolId });
}

/** The signed-in user's own listings; undefined while loading. */
export function useMyListings() {
  return useQuery(api.tools.myListings);
}
