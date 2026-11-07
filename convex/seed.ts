/**
 * Demo data: neighbors with real (test) Clerk accounts, fifteen tools with
 * royalty-free photos (Unsplash License, credited in public/seed/CREDITS.md)
 * and a loan history covering every state, with automation activity.
 *
 *   node scripts/seed-demo.mts        # creates the Clerk test accounts, then runs seed:run
 *   npx convex run seed:run           # same data without logins (placeholder identities)
 *   npx convex run seed:reset         # removes the demo data (keeps real accounts)
 *
 * Internal only (never callable from the browser) and idempotent: it does
 * nothing if demo tools already exist. Photos are downloaded by Convex and
 * stored in its file storage, like user uploads.
 */
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { AppLocale, Category, Condition, LoanStatus } from "./shared/constants";
import { addDays, today } from "./shared/dates";
import { vCategory, vCondition, vLoanStatus, vLocale } from "./shared/validators";

const DAY = 24 * 60 * 60 * 1000;

/** Demo neighbors. "me" is the developer's own account, included when it exists. */
export const PEOPLE = [
  { key: "awa", name: "Awa Diallo", email: "awa+clerk_test@lendloop.dev", locale: "fr", trusted: true, admin: false },
  { key: "marc", name: "Marc Lefèvre", email: "marc+clerk_test@lendloop.dev", locale: "fr", trusted: false, admin: false },
  { key: "lea", name: "Léa Martin", email: "lea+clerk_test@lendloop.dev", locale: "en", trusted: false, admin: false },
  { key: "sophie", name: "Sophie Wagner", email: "sophie+clerk_test@lendloop.dev", locale: "de", trusted: true, admin: false },
  // Moderation account for reviewers: no listings or loans, admin area only.
  { key: "admin", name: "LendLoop Admin", email: "admin+clerk_test@lendloop.dev", locale: "en", trusted: false, admin: true },
] as const;

type PersonKey = (typeof PEOPLE)[number]["key"] | "me";

const photo = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=80`;

const TOOLS: {
  owner: PersonKey;
  /** Owner used when the developer's own account is not part of the seed. */
  fallbackOwner?: PersonKey;
  name: string;
  category: Category;
  condition: Condition;
  description: string;
  image: string;
}[] = [
  { owner: "awa", name: "Cordless drill", category: "diy", condition: "good", description: "18 V drill-driver with two batteries, a charger and a set of wood and masonry bits.", image: photo("photo-1572981779307-38b8cabb2407") },
  { owner: "awa", name: "Circular saw", category: "diy", condition: "good", description: "1400 W circular saw with a fine-tooth blade for plywood and a rip fence.", image: photo("photo-1513467655676-561b7d489a88") },
  { owner: "awa", name: "Hand tool set", category: "diy", condition: "fair", description: "Hammer, screwdrivers, pliers, adjustable wrench and tape measure in a carry case.", image: photo("photo-1599651971621-7c42aaa20cd2") },
  { owner: "me", fallbackOwner: "awa", name: "Camping tent", category: "sports", condition: "good", description: "4-person dome tent, sets up in ten minutes. Footprint and pegs included.", image: photo("photo-1504280390367-361c6d9f38f4") },
  { owner: "marc", name: "Aluminium ladder", category: "diy", condition: "good", description: "3-section extension ladder, up to 6 m. Light enough to carry alone.", image: photo("photo-1635082627989-dcd12a107364") },
  { owner: "marc", name: "Tile saw", category: "diy", condition: "worn", description: "Wet tile cutter for ceramic and porcelain. Works well, the table shows its age.", image: photo("photo-1560846389-956694677531") },
  { owner: "marc", name: "Lawn mower", category: "garden", condition: "good", description: "Petrol push mower, 46 cm cut, grass box included. Fuel not provided.", image: photo("photo-1458245201577-fc8a130b8829") },
  { owner: "marc", name: "Robot vacuum", category: "cleaning", condition: "good", description: "Robot vacuum with charging dock. Ideal for a weekend deep clean.", image: photo("photo-1558317374-067fb5f30001") },
  { owner: "lea", name: "Hedge trimmer", category: "garden", condition: "good", description: "Cordless hedge trimmer with a 50 cm blade. Gloves and goggles lent with it.", image: photo("photo-1734079692102-01de4d42697d") },
  { owner: "lea", name: "Wheelbarrow", category: "garden", condition: "fair", description: "Sturdy 90 L wheelbarrow, pneumatic tyre recently replaced.", image: photo("photo-1715274036728-4385d95a5e9f") },
  { owner: "lea", name: "Garden hand tools", category: "garden", condition: "good", description: "Trowel, hand fork, pruner and weeder — everything for planting season.", image: photo("photo-1526381805515-3fec2d69e7cc") },
  { owner: "lea", name: "City bike", category: "sports", condition: "fair", description: "Comfortable city bike with basket and lights. Helmet available on request.", image: photo("photo-1501147830916-ce44a6359892") },
  { owner: "sophie", name: "Leaf rakes", category: "garden", condition: "worn", description: "Two wide rakes, perfect for autumn leaves.", image: photo("photo-1774365294150-5d6051b6c53a") },
  { owner: "me", fallbackOwner: "sophie", name: "Stand mixer", category: "kitchen", condition: "new", description: "5 L stand mixer with whisk, dough hook and flat beater. Used twice.", image: photo("photo-1758565810987-ca8d617ea7be") },
  { owner: "sophie", name: "Pressure washer", category: "cleaning", condition: "good", description: "130 bar pressure washer with patio cleaner attachment and 8 m hose.", image: photo("photo-1782235869457-069673be2dc3") },
];

/** Loan history relative to today, so every state is always visible. */
const LOANS: { tool: string; borrower: PersonKey; start: number; end: number; status: LoanStatus }[] = [
  // Requests waiting for a decision (two of them overlap on the drill).
  { tool: "Cordless drill", borrower: "marc", start: 3, end: 5, status: "pending" },
  { tool: "Cordless drill", borrower: "lea", start: 4, end: 6, status: "pending" },
  { tool: "Hand tool set", borrower: "me", start: 6, end: 7, status: "pending" },
  { tool: "Robot vacuum", borrower: "awa", start: 10, end: 11, status: "pending" },
  { tool: "Stand mixer", borrower: "lea", start: 5, end: 6, status: "pending" },
  // On loan now, upcoming, due tomorrow and overdue.
  { tool: "Lawn mower", borrower: "lea", start: -2, end: 3, status: "approved" },
  { tool: "Aluminium ladder", borrower: "awa", start: -3, end: 1, status: "approved" },
  { tool: "Camping tent", borrower: "sophie", start: 8, end: 12, status: "approved" },
  { tool: "Wheelbarrow", borrower: "sophie", start: 2, end: 4, status: "approved" },
  { tool: "Hedge trimmer", borrower: "me", start: -7, end: -3, status: "approved" },
  { tool: "Garden hand tools", borrower: "awa", start: -6, end: -2, status: "approved" },
  { tool: "Pressure washer", borrower: "marc", start: -6, end: -2, status: "approved" },
  // Finished history.
  { tool: "Cordless drill", borrower: "sophie", start: -30, end: -28, status: "returned" },
  { tool: "Cordless drill", borrower: "me", start: -12, end: -10, status: "returned" },
  { tool: "Circular saw", borrower: "lea", start: -15, end: -13, status: "returned" },
  { tool: "Circular saw", borrower: "marc", start: -40, end: -38, status: "returned" },
  { tool: "Hand tool set", borrower: "sophie", start: -8, end: -6, status: "returned" },
  { tool: "Camping tent", borrower: "marc", start: -60, end: -55, status: "returned" },
  { tool: "Aluminium ladder", borrower: "me", start: -20, end: -18, status: "returned" },
  { tool: "Tile saw", borrower: "awa", start: -45, end: -44, status: "returned" },
  { tool: "Wheelbarrow", borrower: "awa", start: -14, end: -12, status: "returned" },
  { tool: "City bike", borrower: "marc", start: -18, end: -16, status: "returned" },
  { tool: "Leaf rakes", borrower: "lea", start: -35, end: -33, status: "returned" },
  { tool: "Stand mixer", borrower: "awa", start: -20, end: -18, status: "returned" },
  { tool: "Camping tent", borrower: "lea", start: -25, end: -23, status: "declined" },
  { tool: "Robot vacuum", borrower: "sophie", start: -10, end: -9, status: "declined" },
  { tool: "Hedge trimmer", borrower: "marc", start: -10, end: -9, status: "declined" },
  { tool: "Aluminium ladder", borrower: "lea", start: -5, end: -4, status: "cancelled" },
  { tool: "City bike", borrower: "awa", start: 2, end: 3, status: "cancelled" },
];

const vAccount = v.object({ key: v.string(), tokenIdentifier: v.string(), email: v.string(), name: v.string() });

export const hasData = internalQuery({
  args: {},
  handler: async (ctx) => {
    const tools = await ctx.db.query("tools").collect();
    return tools.some((tool) => TOOLS.some((seed) => seed.name === tool.name));
  },
});

async function upsertUser(
  ctx: MutationCtx,
  account: { tokenIdentifier: string; email: string; name: string },
  defaults: { locale: AppLocale; trusted: boolean; admin: boolean },
) {
  const existing = await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", account.tokenIdentifier))
    .unique();
  if (existing) {
    if (defaults.admin && existing.role !== "admin") await ctx.db.patch(existing._id, { role: "admin" });
    return existing._id;
  }
  return await ctx.db.insert("users", {
    tokenIdentifier: account.tokenIdentifier,
    name: account.name,
    email: account.email,
    role: defaults.admin ? "admin" : "user",
    trustedLender: defaults.trusted,
    locale: defaults.locale,
  });
}

export const insertDemoData = internalMutation({
  args: {
    accounts: v.array(vAccount),
    meLocale: v.optional(vLocale),
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
  handler: async (ctx, { accounts, meLocale, tools, loans }) => {
    const byKey = new Map(accounts.map((account) => [account.key, account]));
    const users = new Map<string, Id<"users">>();
    for (const person of PEOPLE) {
      const account = byKey.get(person.key) ?? {
        tokenIdentifier: `seed|${person.key}`,
        email: person.email,
        name: person.name,
      };
      users.set(person.key, await upsertUser(ctx, account, person));
    }
    const me = byKey.get("me");
    if (me) users.set("me", await upsertUser(ctx, me, { locale: meLocale ?? "fr", trusted: true, admin: true }));

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
    let loanCount = 0;
    for (const loan of loans) {
      const tool = toolIds.get(loan.tool);
      const borrowerId = users.get(loan.borrower);
      if (!tool || !borrowerId || borrowerId === tool.ownerId) continue;

      const requestedAt = now + (loan.start - 4) * DAY;
      const loanId = await ctx.db.insert("loans", {
        toolId: tool.id,
        toolName: loan.tool,
        ownerId: tool.ownerId,
        borrowerId,
        startDate: addDays(day, loan.start),
        endDate: addDays(day, loan.end),
        status: loan.status,
        ...(loan.status !== "pending" && { decidedAt: Math.min(now, requestedAt + DAY) }),
        ...(loan.status === "returned" && { returnedAt: now + loan.end * DAY }),
      });
      loanCount++;

      // Automation history, timestamped like it really happened.
      const events: { type: "notification_sent" | "due_tomorrow_reminder_sent" | "overdue_reminder_sent"; at: number }[] = [
        { type: "notification_sent", at: Math.min(now, requestedAt) },
      ];
      if (loan.status !== "pending") events.push({ type: "notification_sent", at: Math.min(now, requestedAt + DAY) });
      if (loan.status === "returned" || (loan.status === "approved" && loan.end <= 1)) {
        events.push({ type: "due_tomorrow_reminder_sent", at: Math.min(now, now + (loan.end - 1) * DAY) });
      }
      if (loan.status === "approved" && loan.end < 0) {
        for (let daysLate = 1; daysLate <= -loan.end; daysLate++) {
          events.push({ type: "overdue_reminder_sent", at: now + (loan.end + daysLate) * DAY });
        }
      }
      if (loan.status === "returned") events.push({ type: "notification_sent", at: now + loan.end * DAY });
      for (const [index, event] of events.entries()) {
        await ctx.db.insert("automationEvents", {
          eventId: `seed:${event.type}:${loanId}:${index}`,
          loanId,
          type: event.type,
          channel: "email",
          occurredAt: event.at,
        });
      }
    }
    return { users: users.size, tools: toolIds.size, loans: loanCount };
  },
});

export const run = internalAction({
  args: { accounts: v.optional(v.array(vAccount)), meLocale: v.optional(vLocale) },
  handler: async (ctx, { accounts = [], meLocale }): Promise<string> => {
    if (await ctx.runQuery(internal.seed.hasData, {})) return "Demo data already present: run seed:reset first.";
    const hasMe = accounts.some((account) => account.key === "me");

    const tools = [];
    for (const { image, owner, fallbackOwner, ...tool } of TOOLS) {
      let imageId: Id<"_storage"> | undefined;
      try {
        const response = await fetch(image);
        if (response.ok) imageId = await ctx.storage.store(await response.blob());
      } catch {
        // No network: the tool is created without a photo (category icon shown).
      }
      tools.push({ ...tool, owner: owner === "me" && !hasMe ? fallbackOwner! : owner, imageId });
    }

    const result: { users: number; tools: number; loans: number } = await ctx.runMutation(
      internal.seed.insertDemoData,
      { accounts, meLocale, tools, loans: LOANS },
    );
    const withPhoto = tools.filter((tool) => tool.imageId).length;
    return `Seeded ${result.users} users, ${result.tools} tools (${withPhoto} with photos) and ${result.loans} loans.`;
  },
});

/** Removes the demo data: demo users, demo tools (whoever owns them), their loans and events. */
export const reset = internalMutation({
  args: {},
  handler: async (ctx) => {
    const demoEmails = new Set<string>(PEOPLE.map((person) => person.email));
    const demoUsers = (await ctx.db.query("users").collect()).filter(
      (user) => user.tokenIdentifier.startsWith("seed|") || demoEmails.has(user.email) || user.email.endsWith("@lendloop.demo"),
    );
    const demoUserIds = new Set(demoUsers.map((user) => user._id));
    const demoToolIds = new Set<string>();
    for (const tool of await ctx.db.query("tools").collect()) {
      if (demoUserIds.has(tool.ownerId) || TOOLS.some((seed) => seed.name === tool.name)) {
        demoToolIds.add(tool._id);
        if (tool.imageId) await ctx.storage.delete(tool.imageId);
        await ctx.db.delete(tool._id);
      }
    }

    let removed = 0;
    for (const loan of await ctx.db.query("loans").collect()) {
      if (!demoToolIds.has(loan.toolId) && !demoUserIds.has(loan.ownerId) && !demoUserIds.has(loan.borrowerId)) continue;
      for (const event of await ctx.db
        .query("automationEvents")
        .withIndex("by_loan", (q) => q.eq("loanId", loan._id))
        .collect()) {
        await ctx.db.delete(event._id);
      }
      for (const row of (await ctx.db.query("outbox").collect()).filter((row) => row.loanId === loan._id)) {
        await ctx.db.delete(row._id);
      }
      await ctx.db.delete(loan._id);
      removed++;
    }
    for (const user of demoUsers) await ctx.db.delete(user._id);
    return `Removed ${demoUsers.length} demo users, ${demoToolIds.size} tools and ${removed} loans.`;
  },
});
