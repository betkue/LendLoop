"use client";

import type { Id } from "@/convex/_generated/dataModel";
import { ToolDetail } from "@/features/tools";

/**
 * Composes the tools and loans modules for the tool page; neither module
 * imports the other. The borrowing panel is added by the loans module.
 */
export function ToolPage({ toolId }: { toolId: Id<"tools"> }) {
  return <ToolDetail toolId={toolId} />;
}
