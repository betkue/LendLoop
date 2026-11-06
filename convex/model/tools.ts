import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { appError } from "../lib/errors";
import {
  TOOL_DESCRIPTION_MAX,
  TOOL_IMAGE_MAX_BYTES,
  TOOL_IMAGE_TYPES,
  TOOL_NAME_MAX,
} from "../shared/constants";
import { isWithin, today } from "../shared/dates";

type Ctx = QueryCtx | MutationCtx;

/** Approved (not yet returned) loans of a tool. */
export async function approvedLoans(ctx: Ctx, toolId: Id<"tools">): Promise<Doc<"loans">[]> {
  return await ctx.db
    .query("loans")
    .withIndex("by_tool_status", (q) => q.eq("toolId", toolId).eq("status", "approved"))
    .collect();
}

/** A tool is available when no approved, unreturned loan covers today. */
export async function isAvailableToday(ctx: Ctx, toolId: Id<"tools">, now = Date.now()): Promise<boolean> {
  const day = today(now);
  const loans = await approvedLoans(ctx, toolId);
  return !loans.some((loan) => isWithin(day, loan));
}

export async function getToolOrThrow(ctx: Ctx, toolId: Id<"tools">): Promise<Doc<"tools">> {
  const tool = await ctx.db.get(toolId);
  if (!tool) throw appError("NOT_FOUND");
  return tool;
}

export async function imageUrl(ctx: Ctx, imageId: Id<"_storage"> | undefined): Promise<string | null> {
  return imageId ? await ctx.storage.getUrl(imageId) : null;
}

/** Trims and checks the free-text fields; throws INVALID_INPUT when out of bounds. */
export function cleanToolText(fields: { name: string; description: string }) {
  const name = fields.name.trim();
  const description = fields.description.trim();
  if (name.length === 0 || name.length > TOOL_NAME_MAX || description.length > TOOL_DESCRIPTION_MAX) {
    throw appError("INVALID_INPUT");
  }
  return { name, description };
}

/**
 * Rejects uploads that are not a JPEG, PNG or WebP under 5 MB, deleting the
 * stored file so rejected uploads do not linger.
 */
export async function assertValidImage(ctx: MutationCtx, imageId: Id<"_storage">): Promise<void> {
  const file = await ctx.db.system.get(imageId);
  const validType = (TOOL_IMAGE_TYPES as readonly string[]).includes(file?.contentType ?? "");
  if (!file || !validType || file.size > TOOL_IMAGE_MAX_BYTES) {
    if (file) await ctx.storage.delete(imageId);
    throw appError("INVALID_INPUT");
  }
}

/**
 * Deletes a tool once no approved loan is in progress: pending requests are
 * declined first so borrowers are not left waiting. Loans keep their tool name
 * snapshot for history. Returns the declined loan ids (to notify borrowers).
 */
export async function deleteTool(ctx: MutationCtx, tool: Doc<"tools">): Promise<Id<"loans">[]> {
  if ((await approvedLoans(ctx, tool._id)).length > 0) throw appError("TOOL_HAS_ACTIVE_LOAN");

  const pending = await ctx.db
    .query("loans")
    .withIndex("by_tool_status", (q) => q.eq("toolId", tool._id).eq("status", "pending"))
    .collect();
  const now = Date.now();
  for (const loan of pending) {
    await ctx.db.patch(loan._id, { status: "declined", decidedAt: now });
  }

  if (tool.imageId) await ctx.storage.delete(tool.imageId);
  await ctx.db.delete(tool._id);
  return pending.map((loan) => loan._id);
}
