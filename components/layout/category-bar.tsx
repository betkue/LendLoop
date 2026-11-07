"use client";

import { useTranslations } from "next-intl";
import { LayoutGridIcon } from "lucide-react";
import { CATEGORIES } from "@/convex/shared/constants";
import { Link, usePathname } from "@/i18n/navigation";
import { CATEGORY_ICONS } from "@/lib/category-icons";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";

/**
 * Category links under the header (desktop and tablet), vertical in the mobile
 * sheet. Each category has its own page.
 */
export function CategoryBar({
  orientation = "horizontal",
  onNavigate,
}: {
  orientation?: "horizontal" | "vertical";
  onNavigate?: () => void;
}) {
  const t = useTranslations();
  const pathname = usePathname();
  const vertical = orientation === "vertical";
  const items = [
    { href: routes.tools, label: t("header.allTools"), Icon: LayoutGridIcon },
    ...CATEGORIES.map((category) => ({
      href: routes.category(category),
      label: t(`tools.categories.${category}`),
      Icon: CATEGORY_ICONS[category],
    })),
  ];

  return (
    <nav aria-label={t("header.categories")}>
      <ul className={cn("flex", vertical ? "flex-col gap-1" : "gap-1")}>
        {items.map(({ href, label, Icon }) => {
          const active = pathname === href;
          return (
            <li key={href} className="shrink-0">
              <Link
                href={href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 text-sm font-medium whitespace-nowrap transition-colors",
                  vertical ? "h-11" : "h-9",
                  active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="size-4" aria-hidden="true" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
