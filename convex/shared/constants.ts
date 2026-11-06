/**
 * Business constants shared by Convex functions and the Next.js front-end.
 * Values are stable keys stored in the database; labels are translated in the
 * front-end (messages/<locale>.json), never stored.
 */

export const LOCALES = ["en", "fr", "zh", "de"] as const;
export type AppLocale = (typeof LOCALES)[number];

export const ROLES = ["user", "admin"] as const;
export type Role = (typeof ROLES)[number];

export const CATEGORIES = ["diy", "garden", "kitchen", "cleaning", "sports", "other"] as const;
export type Category = (typeof CATEGORIES)[number];

export const CONDITIONS = ["new", "good", "fair", "worn"] as const;
export type Condition = (typeof CONDITIONS)[number];

export const LOAN_STATUSES = ["pending", "approved", "declined", "cancelled", "returned"] as const;
export type LoanStatus = (typeof LOAN_STATUSES)[number];

/** Error codes thrown by Convex functions (ConvexError({ code })) and translated by the UI. */
export const ERROR_CODES = [
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "NOT_FOUND",
  "INVALID_INPUT",
  "INVALID_DATES",
  "DATES_OVERLAP",
  "OWN_TOOL",
  "TOOL_HAS_ACTIVE_LOAN",
  "INVALID_TRANSITION",
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];

export const TOOL_NAME_MAX = 80;
export const TOOL_DESCRIPTION_MAX = 500;
export const TOOL_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const TOOL_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
