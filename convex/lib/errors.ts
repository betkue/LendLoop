import { ConvexError } from "convex/values";
import type { ErrorCode } from "../shared/constants";

/**
 * Business error sent to the client as a code only (no message, no data
 * leak); the UI translates it with t(`errors.${code}`).
 */
export function appError(code: ErrorCode): ConvexError<{ code: ErrorCode }> {
  return new ConvexError({ code });
}
