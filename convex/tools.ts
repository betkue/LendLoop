import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { requireOwner, requireUser } from "./lib/auth";
import { appError } from "./lib/errors";
import {
  approvedLoans,
  assertValidImage,
  cleanToolText,
  deleteTool,
  getToolOrThrow,
  imageUrl,
  isAvailableToday,
} from "./model/tools";
import { vCategory, vCondition } from "./shared/validators";

const PUBLIC_LIMIT = 24;

/** Card data shown to signed-in members (no email, no owner id). */
async function toCard(ctx: QueryCtx, tool: Doc<"tools">, viewerId: Doc<"users">["_id"]) {
  const owner = await ctx.db.get(tool.ownerId);
  return {
    _id: tool._id,
    name: tool.name,
    category: tool.category,
    condition: tool.condition,
    description: tool.description,
    imageUrl: await imageUrl(ctx, tool.imageId),
    available: await isAvailableToday(ctx, tool._id),
    ownerName: owner?.name.split(" ")[0] ?? "",
    trustedLender: owner?.trustedLender ?? false,
    isMine: tool.ownerId === viewerId,
    createdAt: tool._creationTime,
  };
}

/**
 * Public landing page: available tools with their name, category and photo
 * only. Nothing about the owner leaves the server.
 */
export const listPublic = query({
  args: {},
  handler: async (ctx) => {
    const tools = await ctx.db.query("tools").order("desc").take(PUBLIC_LIMIT * 2);
    const result = [];
    for (const tool of tools) {
      if (result.length >= PUBLIC_LIMIT) break;
      if (!(await isAvailableToday(ctx, tool._id))) continue;
      result.push({
        _id: tool._id,
        name: tool.name,
        category: tool.category,
        imageUrl: await imageUrl(ctx, tool.imageId),
      });
    }
    return result;
  },
});

/** All tools for members, newest first, optionally filtered by category. */
export const list = query({
  args: { category: v.optional(vCategory) },
  handler: async (ctx, { category }) => {
    const viewer = await requireUser(ctx);
    const tools = category
      ? await ctx.db
          .query("tools")
          .withIndex("by_category", (q) => q.eq("category", category))
          .order("desc")
          .collect()
      : await ctx.db.query("tools").order("desc").collect();
    return await Promise.all(tools.map((tool) => toCard(ctx, tool, viewer._id)));
  },
});

/** One tool with its owner's first name; null when it no longer exists. */
export const get = query({
  args: { toolId: v.id("tools") },
  handler: async (ctx, { toolId }) => {
    const viewer = await requireUser(ctx);
    const tool = await ctx.db.get(toolId);
    return tool ? await toCard(ctx, tool, viewer._id) : null;
  },
});

/** The signed-in user's own tools, with what the "My listings" screen needs. */
export const myListings = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const tools = await ctx.db
      .query("tools")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .order("desc")
      .collect();
    return await Promise.all(
      tools.map(async (tool) => {
        const pending = await ctx.db
          .query("loans")
          .withIndex("by_tool_status", (q) => q.eq("toolId", tool._id).eq("status", "pending"))
          .collect();
        return {
          ...(await toCard(ctx, tool, user._id)),
          pendingRequests: pending.length,
          hasActiveLoan: (await approvedLoans(ctx, tool._id)).length > 0,
        };
      }),
    );
  },
});

/** Short-lived URL the browser uploads a tool photo to. */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireUser(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

const toolFields = {
  name: v.string(),
  category: vCategory,
  condition: vCondition,
  description: v.string(),
};

export const create = mutation({
  args: { ...toolFields, imageId: v.optional(v.id("_storage")) },
  handler: async (ctx, { imageId, ...fields }) => {
    const user = await requireUser(ctx);
    const text = cleanToolText(fields);
    if (imageId) await assertValidImage(ctx, imageId);
    return await ctx.db.insert("tools", {
      ownerId: user._id,
      category: fields.category,
      condition: fields.condition,
      ...text,
      imageId,
    });
  },
});

/** Owner-only edit. imageId: a new upload, null to remove the photo, omitted to keep it. */
export const update = mutation({
  args: { toolId: v.id("tools"), ...toolFields, imageId: v.optional(v.union(v.id("_storage"), v.null())) },
  handler: async (ctx, { toolId, imageId, ...fields }) => {
    const tool = await getToolOrThrow(ctx, toolId);
    await requireOwner(ctx, tool.ownerId);
    const text = cleanToolText(fields);

    let nextImageId = tool.imageId;
    if (imageId !== undefined && imageId !== tool.imageId) {
      if (imageId) await assertValidImage(ctx, imageId);
      if (tool.imageId) await ctx.storage.delete(tool.imageId);
      nextImageId = imageId ?? undefined;
    }

    await ctx.db.patch(toolId, {
      category: fields.category,
      condition: fields.condition,
      ...text,
      imageId: nextImageId,
    });
  },
});

/** Owner-only delete; refused while an approved loan is in progress. */
export const remove = mutation({
  args: { toolId: v.id("tools") },
  handler: async (ctx, { toolId }) => {
    const tool = await ctx.db.get(toolId);
    if (!tool) throw appError("NOT_FOUND");
    await requireOwner(ctx, tool.ownerId);
    await deleteTool(ctx, tool);
  },
});
