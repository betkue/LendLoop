import { describe, expect, test } from "vitest";
import { api } from "../_generated/api";
import { sampleTool, setupTest, signIn } from "../../test/convex-setup";

async function setup() {
  const t = setupTest();
  const awa = await signIn(t, "Awa");
  await awa.asUser.mutation(api.tools.create, sampleTool);
  await awa.asUser.mutation(api.tools.create, { ...sampleTool, name: "Lawn mower", category: "garden" });
  await awa.asUser.mutation(api.tools.create, { ...sampleTool, name: "Hedge trimmer", category: "garden" });
  return { t, awa };
}

describe("catalog", () => {
  test("visitors browse without any owner information", async () => {
    const { t } = await setup();
    const tools = await t.query(api.tools.catalog, {});
    expect(tools).toHaveLength(3);
    for (const tool of tools) {
      expect(tool).toMatchObject({ ownerName: null, trustedLender: false, isMine: false });
    }
  });

  test("members see the lender's first name and their own tools", async () => {
    const { awa } = await setup();
    const [tool] = await awa.asUser.query(api.tools.catalog, {});
    expect(tool).toMatchObject({ ownerName: "Awa", isMine: true });
  });

  test("filters by category and searches by name", async () => {
    const { t } = await setup();
    expect((await t.query(api.tools.catalog, { category: "garden" })).map((tool) => tool.name).sort()).toEqual([
      "Hedge trimmer",
      "Lawn mower",
    ]);
    expect((await t.query(api.tools.catalog, { search: "mower" })).map((tool) => tool.name)).toEqual(["Lawn mower"]);
    expect(await t.query(api.tools.catalog, { search: "mower", category: "diy" })).toHaveLength(0);
    expect(await t.query(api.tools.categoryCounts, {})).toEqual({ diy: 1, garden: 2 });
  });
});
