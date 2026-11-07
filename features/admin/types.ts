import type { FunctionReturnType } from "convex/server";
import type { api } from "@/convex/_generated/api";

export type AdminLoan = FunctionReturnType<typeof api.admin.allLoans>[number];
export type AdminUser = FunctionReturnType<typeof api.admin.users>[number];
