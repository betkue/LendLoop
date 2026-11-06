import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

type Messages = Record<string, unknown>;

/** Recursively fills keys missing from `messages` with the English ones. */
function withFallback(fallback: Messages, messages: Messages): Messages {
  const result: Messages = { ...fallback };
  for (const [key, value] of Object.entries(messages)) {
    const base = fallback[key];
    result[key] =
      value && typeof value === "object" && base && typeof base === "object"
        ? withFallback(base as Messages, value as Messages)
        : value;
  }
  return result;
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  const english = (await import("../messages/en.json")).default;
  if (locale === routing.defaultLocale) {
    return { locale, messages: english };
  }

  // Untranslated keys fall back to English instead of showing raw keys.
  const localized = (await import(`../messages/${locale}.json`)).default;
  return { locale, messages: withFallback(english, localized) };
});
