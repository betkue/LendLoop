"use client";

import { Suspense, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { MenuIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { routes } from "@/lib/routes";
import { AccountMenu } from "./account-menu";
import { CategoryBar } from "./category-bar";
import { LanguageSwitcher } from "./language-switcher";
import { Logo } from "./logo";
import { Nav } from "./nav";
import { SearchBox } from "./search-box";

/**
 * Store-style sticky header shared by public and member pages.
 * Row 1: logo, search, account area. Row 2 (tablet and up): category links.
 * Phones: search gets its own row and categories + member links move into a
 * slide-over sheet. `userMenu` and `actions` are injected by the page layout so
 * this shared component stays free of business code.
 */
export function Header({
  userMenu,
  member = false,
  showAdmin = false,
  actions,
  onLocaleChange,
}: {
  userMenu?: ReactNode;
  member?: boolean;
  showAdmin?: boolean;
  actions?: ReactNode;
  onLocaleChange?: (locale: Locale) => void;
}) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            render={<Button variant="ghost" size="icon-lg" className="size-11 md:hidden" aria-label={t("common.openMenu")} />}
          >
            <MenuIcon aria-hidden="true" />
          </SheetTrigger>
          <SheetContent side="left" className="w-80 overflow-y-auto">
            <SheetHeader>
              <SheetTitle>
                <Logo />
              </SheetTitle>
            </SheetHeader>
            <div className="space-y-4 px-2 pb-6">
              <p className="px-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {t("header.categories")}
              </p>
              <CategoryBar orientation="vertical" onNavigate={close} />
              {member && (
                <>
                  <Separator />
                  <p className="px-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    {t("header.mySpace")}
                  </p>
                  <Nav showAdmin={showAdmin} orientation="vertical" onNavigate={close} />
                </>
              )}
            </div>
          </SheetContent>
        </Sheet>

        <Link href={routes.home} className="shrink-0 rounded-lg">
          <Logo />
        </Link>

        <Suspense fallback={<div className="hidden flex-1 md:block" />}>
          <SearchBox className="mx-auto hidden w-full max-w-xl flex-1 md:block" />
        </Suspense>

        <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2 md:ml-0">
          {actions}
          {member && (
            <div className="hidden lg:block">
              <AccountMenu showAdmin={showAdmin} />
            </div>
          )}
          <LanguageSwitcher onLocaleChange={onLocaleChange} />
          {userMenu}
        </div>
      </div>

      <div className="px-4 pb-3 md:hidden">
        <Suspense fallback={null}>
          <SearchBox />
        </Suspense>
      </div>

      <div className="hidden border-t md:block">
        <div className="mx-auto max-w-6xl overflow-x-auto px-4 py-1.5 sm:px-6">
          <CategoryBar />
        </div>
      </div>
    </header>
  );
}
