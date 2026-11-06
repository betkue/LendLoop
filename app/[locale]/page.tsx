import { getTranslations, setRequestLocale } from "next-intl/server";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import type { Locale } from "@/i18n/routing";

// Temporary home page; replaced by the public landing page in the tools module.
export default async function Home({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  // The [locale] layout has already rejected unsupported locales with notFound().
  setRequestLocale(locale as Locale);
  const t = await getTranslations("Home");

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex justify-end p-4">
        <LanguageSwitcher />
      </header>
      <main className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("tagline")}</p>
      </main>
    </div>
  );
}
