import type { FunctionReturnType } from "convex/server";
import type { api } from "@/convex/_generated/api";

/** A loan the signed-in user requested ("My requests"). */
export type MyRequest = FunctionReturnType<typeof api.loans.myRequests>[number];

/** A loan on one of the user's tools ("Incoming requests"). */
export type IncomingLoan = FunctionReturnType<typeof api.loans.incoming>[number];
