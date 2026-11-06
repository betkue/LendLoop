import type { NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// Detects the locale (NEXT_LOCALE cookie, then Accept-Language, then "en"),
// redirects unprefixed URLs such as "/" to "/<locale>" and remembers the choice.
const handleI18n = createIntlMiddleware(routing);

export default function proxy(request: NextRequest) {
  return handleI18n(request);
}

export const config = {
  // Skip Next.js internals, API routes and any path with a file extension (static assets).
  matcher: ["/((?!api|trpc|_next|_vercel|.*\\..*).*)"],
};
