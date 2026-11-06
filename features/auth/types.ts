import type { FunctionReturnType } from "convex/server";
import type { api } from "@/convex/_generated/api";

/** The signed-in user's narrow profile, as returned by users.me. */
export type CurrentUser = NonNullable<FunctionReturnType<typeof api.users.me>>;
