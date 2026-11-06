import { describe, expect, test } from "vitest";
import { api } from "../_generated/api";
import { addDays, today } from "../shared/dates";
import { sampleTool, setupTest, signIn } from "../../test/convex-setup";

describe("tools", () => {
  test("the public list exposes name, category and photo only", async () => {
    const t = setupTest();
    const { asUser } = await signIn(t, "Awa");
    await asUser.mutation(api.tools.create, sampleTool);

    const publicTools = await t.query(api.tools.listPublic, {});
    expect(publicTools).toHaveLength(1);
    expect(Object.keys(publicTools[0]).sort()).toEqual(["_id", "category", "imageUrl", "name"]);
  });

  test("members need to be signed in to browse", async () => {
    const t = setupTest();
    await expect(t.query(api.tools.list, {})).rejects.toThrow(/UNAUTHENTICATED/);
  });

  test("only the owner can edit or delete a listing", async () => {
    const t = setupTest();
    const awa = await signIn(t, "Awa");
    const marc = await signIn(t, "Marc");
    const toolId = await awa.asUser.mutation(api.tools.create, sampleTool);

    await expect(
      marc.asUser.mutation(api.tools.update, { toolId, ...sampleTool, name: "Mine now" }),
    ).rejects.toThrow(/FORBIDDEN/);
    await expect(marc.asUser.mutation(api.tools.remove, { toolId })).rejects.toThrow(/FORBIDDEN/);

    await awa.asUser.mutation(api.tools.update, { toolId, ...sampleTool, name: "Impact drill" });
    expect((await awa.asUser.query(api.tools.get, { toolId }))?.name).toBe("Impact drill");
  });

  test("rejects empty or too long names", async () => {
    const t = setupTest();
    const { asUser } = await signIn(t, "Awa");
    await expect(asUser.mutation(api.tools.create, { ...sampleTool, name: "   " })).rejects.toThrow(
      /INVALID_INPUT/,
    );
    await expect(
      asUser.mutation(api.tools.create, { ...sampleTool, name: "x".repeat(81) }),
    ).rejects.toThrow(/INVALID_INPUT/);
  });

  test("a tool on an approved loan is unavailable and cannot be deleted", async () => {
    const t = setupTest();
    const awa = await signIn(t, "Awa");
    const marc = await signIn(t, "Marc");
    const toolId = await awa.asUser.mutation(api.tools.create, sampleTool);
    await t.run(async (ctx) => {
      await ctx.db.insert("loans", {
        toolId,
        toolName: sampleTool.name,
        ownerId: awa.userId,
        borrowerId: marc.userId,
        startDate: today(),
        endDate: addDays(today(), 2),
        status: "approved",
      });
    });

    expect(await t.query(api.tools.listPublic, {})).toHaveLength(0);
    expect((await marc.asUser.query(api.tools.get, { toolId }))?.available).toBe(false);
    await expect(awa.asUser.mutation(api.tools.remove, { toolId })).rejects.toThrow(
      /TOOL_HAS_ACTIVE_LOAN/,
    );
  });

  test("deleting a tool declines its pending requests", async () => {
    const t = setupTest();
    const awa = await signIn(t, "Awa");
    const marc = await signIn(t, "Marc");
    const toolId = await awa.asUser.mutation(api.tools.create, sampleTool);
    const loanId = await t.run((ctx) =>
      ctx.db.insert("loans", {
        toolId,
        toolName: sampleTool.name,
        ownerId: awa.userId,
        borrowerId: marc.userId,
        startDate: addDays(today(), 3),
        endDate: addDays(today(), 4),
        status: "pending",
      }),
    );

    await awa.asUser.mutation(api.tools.remove, { toolId });
    const loan = await t.run((ctx) => ctx.db.get(loanId));
    expect(loan?.status).toBe("declined");
    expect(loan?.toolName).toBe(sampleTool.name);
  });
});
