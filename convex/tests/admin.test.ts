import { afterEach, describe, expect, test, vi } from "vitest";
import { api } from "../_generated/api";
import { addDays, today } from "../shared/dates";
import { sampleTool, setupTest, signIn } from "../../test/convex-setup";

afterEach(() => {
  vi.unstubAllEnvs();
});

async function setup() {
  vi.stubEnv("ADMIN_EMAILS", "sophie@example.com");
  const t = setupTest();
  const sophie = await signIn(t, "Sophie");
  const awa = await signIn(t, "Awa");
  const marc = await signIn(t, "Marc");
  const toolId = await awa.asUser.mutation(api.tools.create, sampleTool);
  return { t, sophie, awa, marc, toolId };
}

describe("admin", () => {
  test("regular members are refused every admin function", async () => {
    const { awa, marc, toolId } = await setup();
    await expect(marc.asUser.query(api.admin.allLoans, {})).rejects.toThrow(/FORBIDDEN/);
    await expect(marc.asUser.query(api.admin.users, {})).rejects.toThrow(/FORBIDDEN/);
    await expect(marc.asUser.mutation(api.admin.removeTool, { toolId })).rejects.toThrow(/FORBIDDEN/);
    await expect(
      marc.asUser.mutation(api.admin.setTrustedLender, { userId: awa.userId, trusted: true }),
    ).rejects.toThrow(/FORBIDDEN/);
  });

  test("an admin sees all loans and can filter them by status", async () => {
    const { sophie, awa, marc, toolId } = await setup();
    const loanId = await marc.asUser.mutation(api.loans.request, {
      toolId,
      startDate: addDays(today(), 1),
      endDate: addDays(today(), 2),
    });
    await awa.asUser.mutation(api.loans.approve, { loanId });

    expect(await sophie.asUser.query(api.admin.allLoans, {})).toHaveLength(1);
    expect(await sophie.asUser.query(api.admin.allLoans, { status: "pending" })).toHaveLength(0);
    expect((await sophie.asUser.query(api.admin.allLoans, { status: "approved" }))[0]).toMatchObject({
      ownerName: "Awa",
      borrowerName: "Marc",
    });
  });

  test("an admin grants the Trusted Lender badge and removes any listing", async () => {
    const { sophie, awa, marc, toolId } = await setup();
    await sophie.asUser.mutation(api.admin.setTrustedLender, { userId: awa.userId, trusted: true });
    expect((await marc.asUser.query(api.tools.get, { toolId }))?.trustedLender).toBe(true);

    await sophie.asUser.mutation(api.admin.removeTool, { toolId });
    expect(await marc.asUser.query(api.tools.get, { toolId })).toBeNull();
  });
});
