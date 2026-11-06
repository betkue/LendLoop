"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { LanguagesIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";

// Each language is shown in its own name, so it is recognizable whatever the current locale.
const LANGUAGE_NAMES: Record<Locale, string> = {
  en: "English",
  fr: "Français",
  zh: "中文",
  de: "Deutsch",
};

/**
 * Switches the UI language while staying on the same page.
 * next-intl stores the choice in the NEXT_LOCALE cookie for later visits.
 */
export function LanguageSwitcher({ onLocaleChange }: { onLocaleChange?: (locale: Locale) => void } = {}) {
  const t = useTranslations("LanguageSwitcher");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function changeLocale(next: string) {
    onLocaleChange?.(next as Locale);
    startTransition(() => {
      router.replace(pathname, { locale: next as Locale });
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            className="h-11 gap-2 px-3 sm:h-9"
            aria-label={t("label")}
            disabled={isPending}
          />
        }
      >
        <LanguagesIcon aria-hidden="true" />
        <span className="text-sm font-medium uppercase">{locale}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuRadioGroup value={locale} onValueChange={changeLocale}>
          {routing.locales.map((code) => (
            <DropdownMenuRadioItem key={code} value={code} lang={code} className="min-h-11 sm:min-h-8">
              {LANGUAGE_NAMES[code]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
