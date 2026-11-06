import { describe, expect, test } from "vitest";
import { addDays, isDay, rangesOverlap } from "../shared/dates";
import { canTransition, displayStatus, isOverdue } from "../shared/loanRules";

describe("calendar days", () => {
  test("validates real YYYY-MM-DD dates only", () => {
    expect(isDay("2026-11-13")).toBe(true);
    expect(isDay("2026-02-30")).toBe(false);
    expect(isDay("13/11/2026")).toBe(false);
  });

  test("adds days across month ends", () => {
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  test("treats ranges as inclusive when checking overlap", () => {
    const loan = { startDate: "2026-11-10", endDate: "2026-11-12" };
    expect(rangesOverlap(loan, { startDate: "2026-11-12", endDate: "2026-11-14" })).toBe(true);
    expect(rangesOverlap(loan, { startDate: "2026-11-13", endDate: "2026-11-14" })).toBe(false);
  });
});

describe("loan rules", () => {
  test("only allows the documented transitions", () => {
    expect(canTransition("pending", "approved")).toBe(true);
    expect(canTransition("pending", "cancelled")).toBe(true);
    expect(canTransition("approved", "returned")).toBe(true);
    expect(canTransition("approved", "declined")).toBe(false);
    expect(canTransition("returned", "approved")).toBe(false);
  });

  test("computes overdue from the end date instead of storing it", () => {
    const now = Date.parse("2026-11-13T09:00:00Z");
    expect(isOverdue({ status: "approved", endDate: "2026-11-12" }, now)).toBe(true);
    expect(isOverdue({ status: "approved", endDate: "2026-11-13" }, now)).toBe(false);
    expect(isOverdue({ status: "returned", endDate: "2026-11-01" }, now)).toBe(false);
    expect(displayStatus({ status: "approved", endDate: "2026-11-12" }, now)).toBe("overdue");
  });
});
