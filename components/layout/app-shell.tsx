import type { ReactNode } from "react";
import type { Locale } from "@/i18n/routing";
import { Footer } from "./footer";
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
  return (
    <div className="flex min-h-dvh flex-col">
      <Header member userMenu={userMenu} showAdmin={showAdmin} onLocaleChange={onLocaleChange} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-10">{children}</main>
      <Footer />
    </div>
  );
}
