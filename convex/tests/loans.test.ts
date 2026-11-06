import { describe, expect, test } from "vitest";
import { api } from "../_generated/api";
import { addDays, today } from "../shared/dates";
import { sampleTool, setupTest, signIn } from "../../test/convex-setup";

async function setup() {
  const t = setupTest();
  const awa = await signIn(t, "Awa");
  const marc = await signIn(t, "Marc");
  const lea = await signIn(t, "Lea");
  const toolId = await awa.asUser.mutation(api.tools.create, sampleTool);
  return { t, awa, marc, lea, toolId };
}

const inDays = (start: number, end: number) => ({
  startDate: addDays(today(), start),
  endDate: addDays(today(), end),
});

describe("loan requests", () => {
  test("a borrower can request a tool and sees it in My requests", async () => {
    const { awa, marc, toolId } = await setup();
    await marc.asUser.mutation(api.loans.request, { toolId, ...inDays(1, 3) });

    const mine = await marc.asUser.query(api.loans.myRequests, {});
    expect(mine).toHaveLength(1);
    expect(mine[0]).toMatchObject({ status: "pending", otherPartyName: "Awa", toolName: sampleTool.name });
    expect(await awa.asUser.query(api.loans.incoming, {})).toHaveLength(1);
  });

  test("owners cannot borrow their own tool", async () => {
    const { awa, toolId } = await setup();
    await expect(awa.asUser.mutation(api.loans.request, { toolId, ...inDays(1, 2) })).rejects.toThrow(
      /OWN_TOOL/,
    );
  });

  test("rejects past dates, reversed ranges and malformed days", async () => {
    const { marc, toolId } = await setup();
    for (const range of [inDays(-2, 1), inDays(3, 1), { startDate: "tomorrow", endDate: "2026-13-01" }]) {
      await expect(marc.asUser.mutation(api.loans.request, { toolId, ...range })).rejects.toThrow(
        /INVALID_DATES/,
      );
    }
  });
});

describe("decisions", () => {
  test("only the owner approves; overlapping approvals are refused", async () => {
    const { t, awa, marc, lea, toolId } = await setup();
    const marcLoan = await marc.asUser.mutation(api.loans.request, { toolId, ...inDays(10, 12) });
    const leaLoan = await lea.asUser.mutation(api.loans.request, { toolId, ...inDays(11, 13) });

    await expect(lea.asUser.mutation(api.loans.approve, { loanId: marcLoan })).rejects.toThrow(/FORBIDDEN/);
    await awa.asUser.mutation(api.loans.approve, { loanId: marcLoan });

    const incoming = await awa.asUser.query(api.loans.incoming, {});
    expect(incoming.find((loan) => loan._id === leaLoan)?.overlapsApproved).toBe(true);
    await expect(awa.asUser.mutation(api.loans.approve, { loanId: leaLoan })).rejects.toThrow(/DATES_OVERLAP/);
    await expect(
      marc.asUser.mutation(api.loans.request, { toolId, ...inDays(12, 14) }),
    ).rejects.toThrow(/DATES_OVERLAP/);

    expect(await marc.asUser.query(api.loans.bookedRanges, { toolId })).toEqual([inDays(10, 12)]);
    const events = await t.run((ctx) => ctx.db.query("outbox").collect());
    expect(events.map((event) => event.type).sort()).toEqual(["loan.approved", "loan.requested", "loan.requested"]);
  });

  test("follows the allowed transitions only", async () => {
    const { awa, marc, toolId } = await setup();
    const loanId = await marc.asUser.mutation(api.loans.request, { toolId, ...inDays(1, 2) });

    await expect(awa.asUser.mutation(api.loans.markReturned, { loanId })).rejects.toThrow(/INVALID_TRANSITION/);
    await awa.asUser.mutation(api.loans.approve, { loanId });
    await expect(marc.asUser.mutation(api.loans.cancel, { loanId })).rejects.toThrow(/INVALID_TRANSITION/);
    await awa.asUser.mutation(api.loans.markReturned, { loanId });
    await expect(awa.asUser.mutation(api.loans.decline, { loanId })).rejects.toThrow(/INVALID_TRANSITION/);

    const [loan] = await marc.asUser.query(api.loans.myRequests, {});
    expect(loan.status).toBe("returned");
    expect(loan.returnedAt).not.toBeNull();
  });

  test("only the borrower cancels a pending request", async () => {
    const { awa, marc, toolId } = await setup();
    const loanId = await marc.asUser.mutation(api.loans.request, { toolId, ...inDays(1, 2) });
    await expect(awa.asUser.mutation(api.loans.cancel, { loanId })).rejects.toThrow(/FORBIDDEN/);
    await marc.asUser.mutation(api.loans.cancel, { loanId });
    expect((await marc.asUser.query(api.loans.myRequests, {}))[0].status).toBe("cancelled");
  });

  test("activity is visible to the loan's parties only", async () => {
    const { awa, marc, lea, toolId } = await setup();
    const loanId = await marc.asUser.mutation(api.loans.request, { toolId, ...inDays(1, 2) });
    expect(await awa.asUser.query(api.loans.activity, { loanId })).toEqual([]);
    await expect(lea.asUser.query(api.loans.activity, { loanId })).rejects.toThrow(/FORBIDDEN/);
  });
});
