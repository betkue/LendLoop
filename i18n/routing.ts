import { defineRouting } from "next-intl/routing";

/**
 * Supported languages. English is the default and the fallback for any
 * missing translation. Every URL carries its locale prefix (/en, /fr, /zh, /de).
 */
export const routing = defineRouting({
  locales: ["en", "fr", "zh", "de"],
  defaultLocale: "en",
  localePrefix: "always",
});

export type Locale = (typeof routing.locales)[number];
