import type { FunctionReturnType } from "convex/server";
import type { api } from "@/convex/_generated/api";

/** A tool card as returned to members (tools.list / tools.get). */
export type ToolCardData = FunctionReturnType<typeof api.tools.list>[number];

/** A public tool (landing page): name, category and photo only. */
export type PublicTool = FunctionReturnType<typeof api.tools.listPublic>[number];

/** A row of "My listings", with pending requests and loan status. */
export type MyListing = FunctionReturnType<typeof api.tools.myListings>[number];

/** A catalog item: owner fields are null/false for visitors (tools.catalog). */
export type CatalogTool = FunctionReturnType<typeof api.tools.catalog>[number];
