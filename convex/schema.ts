import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {
  vAutomationEventType,
  vCategory,
  vChannel,
  vCondition,
  vLoanStatus,
  vLocale,
  vOutboxEventType,
  vOutboxStatus,
  vRole,
} from "./shared/validators";

export default defineSchema({
  // One row per Clerk account, created on first sign-in (users.ensureUser).
  users: defineTable({
    tokenIdentifier: v.string(),
    name: v.string(),
    email: v.string(),
    imageUrl: v.optional(v.string()),
    role: vRole,
    trustedLender: v.boolean(),
    locale: vLocale,
  }).index("by_token", ["tokenIdentifier"]),

  tools: defineTable({
    ownerId: v.id("users"),
    name: v.string(),
    category: vCategory,
    condition: vCondition,
    description: v.string(),
    imageId: v.optional(v.id("_storage")),
  })
    .index("by_owner", ["ownerId"])
    .index("by_category", ["category"])
    // Full-text search on the tool name, optionally within one category.
    .searchIndex("search_name", { searchField: "name", filterFields: ["category"] }),

  loans: defineTable({
    toolId: v.id("tools"),
    // Snapshot of the tool name so history stays readable after a tool is removed.
    toolName: v.string(),
    // Copied from the tool so "Incoming requests" reads a single index.
    ownerId: v.id("users"),
    borrowerId: v.id("users"),
    startDate: v.string(), // YYYY-MM-DD
    endDate: v.string(), // YYYY-MM-DD
    status: vLoanStatus,
    decidedAt: v.optional(v.number()),
    returnedAt: v.optional(v.number()),
  })
    .index("by_tool_status", ["toolId", "status"])
    .index("by_borrower", ["borrowerId"])
    .index("by_owner_status", ["ownerId", "status"])
    .index("by_status_endDate", ["status", "endDate"]),

  // Events waiting to be delivered to n8n. No personal data: recipients are
  // resolved from loanId at send time.
  outbox: defineTable({
    eventId: v.string(),
    type: vOutboxEventType,
    loanId: v.id("loans"),
    status: vOutboxStatus,
    attempts: v.number(),
    nextAttemptAt: v.number(),
    lastError: v.optional(v.string()),
  })
    .index("by_status_nextAttempt", ["status", "nextAttemptAt"])
    .index("by_eventId", ["eventId"]),

  // History of what the automations did, shown per loan ("Reminder sent 2 days ago").
  automationEvents: defineTable({
    eventId: v.string(),
    loanId: v.id("loans"),
    type: vAutomationEventType,
    channel: v.optional(vChannel),
    detail: v.optional(v.string()),
  })
    .index("by_eventId", ["eventId"])
    .index("by_loan", ["loanId"]),
});
