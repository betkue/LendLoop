import { preloadQuery } from "convex/nextjs";
import { setRequestLocale } from "next-intl/server";
import { api } from "@/convex/_generated/api";
import { PublicLanding } from "@/features/tools";
import type { Locale } from "@/i18n/routing";

// Public home page, rendered on the server with the first list of available
// tools, then kept live by Convex in the browser.
export default async function Home({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const preloadedTools = await preloadQuery(api.tools.listPublic, {});
  return <PublicLanding preloadedTools={preloadedTools} />;
}
