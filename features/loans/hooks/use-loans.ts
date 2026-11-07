"use client";

import { api } from "@/convex/_generated/api";
import { useMemberQuery } from "@/hooks/use-member-query";
import type { Id } from "@/convex/_generated/dataModel";

/** Loans the signed-in user requested; undefined while loading. */
export function useMyRequests() {
  return useMemberQuery(api.loans.myRequests);
}

/** Loans on the signed-in user's tools; undefined while loading. */
export function useIncomingRequests() {
  return useMemberQuery(api.loans.incoming);
}

/** Approved periods of a tool, to disable them in the calendar. */
export function useBookedRanges(toolId: Id<"tools">) {
  return useMemberQuery(api.loans.bookedRanges, { toolId });
}

/** Automation history of one loan (reminders, notifications). */
export function useAutomationActivity(loanId: Id<"loans">) {
  return useMemberQuery(api.loans.activity, { loanId });
}
