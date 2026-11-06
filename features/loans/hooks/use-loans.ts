"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

/** Loans the signed-in user requested; undefined while loading. */
export function useMyRequests() {
  return useQuery(api.loans.myRequests);
}

/** Loans on the signed-in user's tools; undefined while loading. */
export function useIncomingRequests() {
  return useQuery(api.loans.incoming);
}

/** Approved periods of a tool, to disable them in the calendar. */
export function useBookedRanges(toolId: Id<"tools">) {
  return useQuery(api.loans.bookedRanges, { toolId });
}

/** Automation history of one loan (reminders, notifications). */
export function useAutomationActivity(loanId: Id<"loans">) {
  return useQuery(api.loans.activity, { loanId });
}
