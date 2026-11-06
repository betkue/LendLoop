"use client";

import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { MenuIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { routes } from "@/lib/routes";
import { LanguageSwitcher } from "./language-switcher";
import { Logo } from "./logo";
import { Nav } from "./nav";

/**
 * Sticky app header. Desktop (lg+): logo, inline nav, language and user menu.
 * Tablet and mobile: the nav moves into a slide-over sheet behind a menu button.
 * `userMenu` is passed in by the page layout so this shared component stays
 * free of business code.
 */
export function Header({
  userMenu,
  showNav = true,
  showAdmin = false,
  actions,
  onLocaleChange,
}: {
  userMenu?: ReactNode;
  showNav?: boolean;
  showAdmin?: boolean;
  actions?: ReactNode;
  onLocaleChange?: (locale: Locale) => void;
}) {
  const t = useTranslations("common");
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
        {showNav && (
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              render={
                <Button variant="ghost" size="icon-lg" className="size-11 lg:hidden" aria-label={t("openMenu")} />
              }
            >
              <MenuIcon aria-hidden="true" />
            </SheetTrigger>
            <SheetContent side="left" className="w-72">
              <SheetHeader>
                <SheetTitle>
                  <Logo />
                </SheetTitle>
              </SheetHeader>
              <div className="px-2">
                <Nav showAdmin={showAdmin} orientation="vertical" onNavigate={() => setOpen(false)} />
              </div>
            </SheetContent>
          </Sheet>
        )}

        <Link href={showNav ? routes.tools : routes.home} className="rounded-lg">
          <Logo />
        </Link>

        {showNav && (
          <div className="ml-4 hidden lg:block">
            <Nav showAdmin={showAdmin} />
          </div>
        )}

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          {actions}
          <LanguageSwitcher onLocaleChange={onLocaleChange} />
          {userMenu}
        </div>
      </div>
    </header>
  );
}
