import { NextResponse } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import createIntlMiddleware from "next-intl/middleware";
import { hasLocale } from "next-intl";
import { routing } from "./i18n/routing";

// Detects the locale (NEXT_LOCALE cookie, then Accept-Language, then "en"),
// redirects unprefixed URLs such as "/" to "/<locale>" and remembers the choice.
const handleI18n = createIntlMiddleware(routing);

// Signed-in areas. This redirect is a convenience: Convex functions still
// re-check the user on every call.
const isProtectedRoute = createRouteMatcher([
  // /tools (catalog) is public; new, detail and edit pages need an account.
  "/:locale/tools/(.*)",
  "/:locale/my-listings(.*)",
  "/:locale/my-requests(.*)",
  "/:locale/incoming(.*)",
  "/:locale/admin(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  if (isProtectedRoute(request)) {
    const { userId } = await auth();
    if (!userId) {
      const segment = request.nextUrl.pathname.split("/")[1];
      const locale = hasLocale(routing.locales, segment) ? segment : routing.defaultLocale;
      const signIn = new URL(`/${locale}/sign-in`, request.url);
      signIn.searchParams.set("redirect_url", request.nextUrl.pathname + request.nextUrl.search);
      return NextResponse.redirect(signIn);
    }
  }
  return handleI18n(request);
});

export const config = {
  // Skip Next.js internals and static files; always run for API routes.
  matcher: ["/((?!_next|_vercel|.*\\..*).*)", "/(api|trpc)(.*)"],
};
