import type { ReactNode } from "react";
import { ClerkProvider } from "@clerk/nextjs";
import { deDE, enUS, frFR, zhCN } from "@clerk/localizations";
import type { Locale } from "@/i18n/routing";
import { ConvexClientProvider } from "./convex-client-provider";

// Clerk's prebuilt screens (sign-in, sign-up, user menu) follow the app language.
const CLERK_LOCALIZATIONS = { en: enUS, fr: frFR, zh: zhCN, de: deDE } satisfies Record<
  Locale,
  unknown
>;

/**
 * Global providers shared by every page.
 * Order matters: Convex needs the Clerk session, so it sits inside ClerkProvider.
 * Clerk reads NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY from the environment.
 */
export function AppProviders({ locale, children }: { locale: Locale; children: ReactNode }) {
  return (
    <ClerkProvider localization={CLERK_LOCALIZATIONS[locale]}>
      <ConvexClientProvider>{children}</ConvexClientProvider>
    </ClerkProvider>
  );
}
