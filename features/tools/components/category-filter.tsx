"use client";

import { useTranslations } from "next-intl";
import { LayoutGridIcon } from "lucide-react";
import { CATEGORIES, type Category } from "@/convex/shared/constants";
import { cn } from "@/lib/utils";
import { CATEGORY_ICONS } from "../constants";

/** Category chips; scrolls horizontally on small screens. */
export function CategoryFilter({
  value,
  onChange,
}: {
  value: Category | null;
  onChange: (value: Category | null) => void;
}) {
  const t = useTranslations("tools");
  const options: { value: Category | null; label: string; Icon: typeof LayoutGridIcon }[] = [
    { value: null, label: t("browse.all"), Icon: LayoutGridIcon },
    ...CATEGORIES.map((category) => ({
      value: category,
      label: t(`categories.${category}`),
      Icon: CATEGORY_ICONS[category],
    })),
  ];

  return (
    <div role="radiogroup" aria-label={t("browse.filterLabel")} className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <div className="flex w-max gap-2 pb-1">
        {options.map(({ value: option, label, Icon }) => {
          const selected = option === value;
          return (
            <button
              key={option ?? "all"}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(option)}
              className={cn(
                "inline-flex h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors sm:h-9",
                selected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="size-4" aria-hidden="true" />
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
