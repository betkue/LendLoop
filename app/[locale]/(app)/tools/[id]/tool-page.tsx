"use client";

import type { Id } from "@/convex/_generated/dataModel";
import { RequestForm } from "@/features/loans";
import { ToolDetail } from "@/features/tools";

/**
 * Composes the tools and loans modules for the tool page; neither module
 * imports the other. Owners see their edit panel instead of the request form.
 */
export function ToolPage({ toolId }: { toolId: Id<"tools"> }) {
  return <ToolDetail toolId={toolId} aside={(tool) => <RequestForm toolId={tool._id} />} />;
}
