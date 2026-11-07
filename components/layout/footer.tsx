import { useTranslations } from "next-intl";
import { Logo } from "./logo";

/** Site footer: tagline and photo credit (Unsplash License). */
export function Footer() {
  const t = useTranslations("footer");
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-3">
          <Logo className="scale-90" />
          <span className="hidden md:inline">{t("tagline")}</span>
        </div>
        <a
          href="https://unsplash.com/license"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-foreground hover:underline"
        >
          {t("credits")}
        </a>
      </div>
    </footer>
  );
}
