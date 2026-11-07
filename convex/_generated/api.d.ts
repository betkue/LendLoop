/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as crons from "../crons.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_errors from "../lib/errors.js";
import type * as lib_hmac from "../lib/hmac.js";
import type * as loans from "../loans.js";
import type * as model_loans from "../model/loans.js";
import type * as model_notifications from "../model/notifications.js";
import type * as model_outbox from "../model/outbox.js";
import type * as model_tools from "../model/tools.js";
import type * as model_users from "../model/users.js";
import type * as outbox from "../outbox.js";
import type * as shared_constants from "../shared/constants.js";
import type * as shared_dates from "../shared/dates.js";
import type * as shared_loanRules from "../shared/loanRules.js";
import type * as shared_validators from "../shared/validators.js";
import type * as tools from "../tools.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  crons: typeof crons;
  "lib/auth": typeof lib_auth;
  "lib/errors": typeof lib_errors;
  "lib/hmac": typeof lib_hmac;
  loans: typeof loans;
  "model/loans": typeof model_loans;
  "model/notifications": typeof model_notifications;
  "model/outbox": typeof model_outbox;
  "model/tools": typeof model_tools;
  "model/users": typeof model_users;
  outbox: typeof outbox;
  "shared/constants": typeof shared_constants;
  "shared/dates": typeof shared_dates;
  "shared/loanRules": typeof shared_loanRules;
  "shared/validators": typeof shared_validators;
  tools: typeof tools;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
