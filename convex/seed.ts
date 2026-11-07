/**
 * Demo data: four neighbors, fifteen tools with royalty-free photos (Unsplash
 * License, credited in public/seed/CREDITS.md) and loans in every state.
 *
 *   npx convex run seed:run     # load the demo
 *   npx convex run seed:reset   # remove the demo data (keeps real accounts)
 *
 * Internal only (never callable from the browser) and idempotent: it does
 * nothing if tools already exist. Photos are downloaded by Convex and stored
 * in its file storage, like user uploads.
 */
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import type { Category, Condition, LoanStatus } from "./shared/constants";
import { addDays, today } from "./shared/dates";
import { vCategory, vCondition, vLoanStatus } from "./shared/validators";

const PEOPLE = [
  { key: "awa", name: "Awa Diallo", email: "awa@lendloop.demo", locale: "fr", trusted: true },
  { key: "marc", name: "Marc Lefèvre", email: "marc@lendloop.demo", locale: "fr", trusted: false },
  { key: "lea", name: "Léa Martin", email: "lea@lendloop.demo", locale: "en", trusted: false },
  { key: "sophie", name: "Sophie Wagner", email: "sophie@lendloop.demo", locale: "de", trusted: true },
] as const;

type PersonKey = (typeof PEOPLE)[number]["key"];

const photo = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=80`;

const TOOLS: {
  owner: PersonKey;
  name: string;
  category: Category;
  condition: Condition;
  description: string;
  image: string;
}[] = [
  { owner: "awa", name: "Cordless drill", category: "diy", condition: "good", description: "18 V drill-driver with two batteries, a charger and a set of wood and masonry bits.", image: photo("photo-1572981779307-38b8cabb2407") },
  { owner: "awa", name: "Circular saw", category: "diy", condition: "good", description: "1400 W circular saw with a fine-tooth blade for plywood and a rip fence.", image: photo("photo-1513467655676-561b7d489a88") },
  { owner: "awa", name: "Hand tool set", category: "diy", condition: "fair", description: "Hammer, screwdrivers, pliers, adjustable wrench and tape measure in a carry case.", image: photo("photo-1599651971621-7c42aaa20cd2") },
  { owner: "marc", name: "Aluminium ladder", category: "diy", condition: "good", description: "3-section extension ladder, up to 6 m. Light enough to carry alone.", image: photo("photo-1635082627989-dcd12a107364") },
  { owner: "marc", name: "Tile saw", category: "diy", condition: "worn", description: "Wet tile cutter for ceramic and porcelain. Works well, the table shows its age.", image: photo("photo-1560846389-956694677531") },
  { owner: "marc", name: "Lawn mower", category: "garden", condition: "good", description: "Petrol push mower, 46 cm cut, grass box included. Fuel not provided.", image: photo("photo-1458245201577-fc8a130b8829") },
  { owner: "lea", name: "Hedge trimmer", category: "garden", condition: "good", description: "Cordless hedge trimmer with a 50 cm blade. Gloves and goggles lent with it.", image: photo("photo-1734079692102-01de4d42697d") },
  { owner: "lea", name: "Wheelbarrow", category: "garden", condition: "fair", description: "Sturdy 90 L wheelbarrow, pneumatic tyre recently replaced.", image: photo("photo-1715274036728-4385d95a5e9f") },
  { owner: "lea", name: "Garden hand tools", category: "garden", condition: "good", description: "Trowel, hand fork, pruner and weeder — everything for planting season.", image: photo("photo-1526381805515-3fec2d69e7cc") },
  { owner: "sophie", name: "Leaf rakes", category: "garden", condition: "worn", description: "Two wide rakes, perfect for autumn leaves.", image: photo("photo-1774365294150-5d6051b6c53a") },
  { owner: "sophie", name: "Stand mixer", category: "kitchen", condition: "new", description: "5 L stand mixer with whisk, dough hook and flat beater. Used twice.", image: photo("photo-1758565810987-ca8d617ea7be") },
  { owner: "sophie", name: "Pressure washer", category: "cleaning", condition: "good", description: "130 bar pressure washer with patio cleaner attachment and 8 m hose.", image: photo("photo-1782235869457-069673be2dc3") },
  { owner: "marc", name: "Robot vacuum", category: "cleaning", condition: "good", description: "Robot vacuum with charging dock. Ideal for a weekend deep clean.", image: photo("photo-1558317374-067fb5f30001") },
  { owner: "awa", name: "Camping tent", category: "sports", condition: "good", description: "4-person dome tent, sets up in ten minutes. Footprint and pegs included.", image: photo("photo-1504280390367-361c6d9f38f4") },
  { owner: "lea", name: "City bike", category: "sports", condition: "fair", description: "Comfortable city bike with basket and lights. Helmet available on request.", image: photo("photo-1501147830916-ce44a6359892") },
];

/** Loans relative to today, so the demo always shows each state. */
const LOANS: { tool: string; borrower: PersonKey; start: number; end: number; status: LoanStatus }[] = [
  { tool: "Cordless drill", borrower: "marc", start: 3, end: 5, status: "pending" },
  { tool: "Cordless drill", borrower: "lea", start: 4, end: 6, status: "pending" },
  { tool: "Lawn mower", borrower: "lea", start: -2, end: 1, status: "approved" },
  { tool: "Pressure washer", borrower: "marc", start: -6, end: -2, status: "approved" },
  { tool: "Camping tent", borrower: "sophie", start: 8, end: 12, status: "approved" },
  { tool: "Stand mixer", borrower: "awa", start: -20, end: -18, status: "returned" },
  { tool: "Hedge trimmer", borrower: "marc", start: -10, end: -9, status: "declined" },
  { tool: "City bike", borrower: "awa", start: 2, end: 3, status: "cancelled" },
];

export const hasData = internalQuery({
  args: {},
  handler: async (ctx) => (await ctx.db.query("tools").first()) !== null,
});

export const insertDemoData = internalMutation({
  args: {
    tools: v.array(
      v.object({
        owner: v.string(),
        name: v.string(),
        category: vCategory,
        condition: vCondition,
        description: v.string(),
        imageId: v.optional(v.id("_storage")),
      }),
    ),
    loans: v.array(
      v.object({ tool: v.string(), borrower: v.string(), start: v.number(), end: v.number(), status: vLoanStatus }),
    ),
  },
  handler: async (ctx, { tools, loans }) => {
    const users = new Map<string, Id<"users">>();
    for (const person of PEOPLE) {
      users.set(
        person.key,
        await ctx.db.insert("users", {
          tokenIdentifier: `seed|${person.key}`,
          name: person.name,
          email: person.email,
          role: "user",
          trustedLender: person.trusted,
          locale: person.locale,
        }),
      );
    }

    const toolIds = new Map<string, { id: Id<"tools">; ownerId: Id<"users"> }>();
    for (const tool of tools) {
      const ownerId = users.get(tool.owner)!;
      const id = await ctx.db.insert("tools", {
        ownerId,
        name: tool.name,
        category: tool.category,
        condition: tool.condition,
        description: tool.description,
        imageId: tool.imageId,
      });
      toolIds.set(tool.name, { id, ownerId });
    }

    const day = today();
    const now = Date.now();
    for (const loan of loans) {
      const tool = toolIds.get(loan.tool)!;
      const loanId = await ctx.db.insert("loans", {
        toolId: tool.id,
        toolName: loan.tool,
        ownerId: tool.ownerId,
        borrowerId: users.get(loan.borrower)!,
        startDate: addDays(day, loan.start),
        endDate: addDays(day, loan.end),
        status: loan.status,
        ...(loan.status !== "pending" && { decidedAt: now }),
        ...(loan.status === "returned" && { returnedAt: now }),
      });
      // History for the demo: the overdue loan already got its first reminder.
      if (loan.status === "approved" && loan.end < 0) {
        await ctx.db.insert("automationEvents", {
          eventId: `seed:overdue_reminder:${loanId}`,
          loanId,
          type: "overdue_reminder_sent",
          channel: "email",
        });
      }
    }
    return { users: users.size, tools: toolIds.size, loans: loans.length };
  },
});

export const run = internalAction({
  args: {},
  handler: async (ctx): Promise<string> => {
    if (await ctx.runQuery(internal.seed.hasData, {})) return "Demo data already present: nothing to do.";

    const tools = [];
    for (const { image, ...tool } of TOOLS) {
      let imageId: Id<"_storage"> | undefined;
      try {
        const response = await fetch(image);
        if (response.ok) imageId = await ctx.storage.store(await response.blob());
      } catch {
        // No network: the tool is created without a photo (category icon shown).
      }
      tools.push({ ...tool, imageId });
    }

    const result: { users: number; tools: number; loans: number } = await ctx.runMutation(
      internal.seed.insertDemoData,
      { tools, loans: LOANS },
    );
    const withPhoto = tools.filter((tool) => tool.imageId).length;
    return `Seeded ${result.users} users, ${result.tools} tools (${withPhoto} with photos) and ${result.loans} loans.`;
  },
});

/** Removes the demo data (seed users, their tools, photos, loans and events). */
export const reset = internalMutation({
  args: {},
  handler: async (ctx) => {
    const seedUsers = (await ctx.db.query("users").collect()).filter((user) =>
      user.tokenIdentifier.startsWith("seed|"),
    );
    const seedUserIds = new Set(seedUsers.map((user) => user._id));
    let removed = 0;
    for (const loan of await ctx.db.query("loans").collect()) {
      if (!seedUserIds.has(loan.ownerId) && !seedUserIds.has(loan.borrowerId)) continue;
      for (const event of await ctx.db
        .query("automationEvents")
        .withIndex("by_loan", (q) => q.eq("loanId", loan._id))
        .collect()) {
        await ctx.db.delete(event._id);
      }
      for (const event of (await ctx.db.query("outbox").collect()).filter((row) => row.loanId === loan._id)) {
        await ctx.db.delete(event._id);
      }
      await ctx.db.delete(loan._id);
      removed++;
    }
    for (const user of seedUsers) {
      for (const tool of await ctx.db
        .query("tools")
        .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
        .collect()) {
        if (tool.imageId) await ctx.storage.delete(tool.imageId);
        await ctx.db.delete(tool._id);
      }
      await ctx.db.delete(user._id);
    }
    return `Removed ${seedUsers.length} demo users and ${removed} loans.`;
  },
});