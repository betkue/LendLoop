import { ConvexError } from "convex/values";
import { ERROR_CODES, type ErrorCode } from "@/convex/shared/constants";

export type UiErrorCode = ErrorCode | "UNKNOWN";

/**
 * Extracts the business error code thrown by a Convex function
 * (ConvexError({ code })). Anything else, such as a network failure, is UNKNOWN.
 * The UI translates the code with t(`errors.${code}`).
 */
export function getErrorCode(error: unknown): UiErrorCode {
  if (error instanceof ConvexError) {
    const code = (error.data as { code?: unknown } | undefined)?.code;
    if (typeof code === "string" && (ERROR_CODES as readonly string[]).includes(code)) {
      return code as ErrorCode;
    }
  }
  return "UNKNOWN";
}
