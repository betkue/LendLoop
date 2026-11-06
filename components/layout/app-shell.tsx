import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import { Header } from "./header";

/** Page frame for signed-in screens: header, centered content column and footer. */
export function AppShell({
  children,
  userMenu,
  showAdmin = false,
  onLocaleChange,
}: {
  children: ReactNode;
  userMenu?: ReactNode;
  showAdmin?: boolean;
  onLocaleChange?: (locale: Locale) => void;
}) {
  const t = useTranslations("footer");
  return (
    <div className="flex min-h-dvh flex-col">
      <Header userMenu={userMenu} showAdmin={showAdmin} onLocaleChange={onLocaleChange} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-10">{children}</main>
      <footer className="border-t">
        <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-muted-foreground sm:px-6">
          {t("tagline")}
        </div>
      </footer>
    </div>
  );
}
