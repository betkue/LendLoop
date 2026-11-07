"use client";

import type { Id } from "@/convex/_generated/dataModel";
import { RemoveToolButton } from "@/features/admin";
import { RequestForm } from "@/features/loans";
import { ToolDetail } from "@/features/tools";

/**
 * Composes the tools, loans and admin modules for the tool page; none of them
 * imports another. Owners see their edit panel instead of the request form;
 * admins also get the moderation panel.
 */
export function ToolPage({ toolId }: { toolId: Id<"tools"> }) {
  return (
    <ToolDetail
      toolId={toolId}
      aside={(tool) => (
        <>
          <RequestForm toolId={tool._id} />
          <RemoveToolButton toolId={tool._id} />
        </>
      )}
    />
  );
}
