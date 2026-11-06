import type messages from "./messages/en.json";
import type { routing } from "./i18n/routing";

// Types next-intl against the English messages: an unknown key in t("…")
// or an unsupported locale becomes a TypeScript error.
declare module "next-intl" {
  interface AppConfig {
    Locale: (typeof routing.locales)[number];
    Messages: typeof messages;
  }
}
