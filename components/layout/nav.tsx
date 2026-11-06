"use client";

import { useTranslations } from "next-intl";
import type { LucideIcon } from "lucide-react";
import { InboxIcon, LayoutGridIcon, PackageIcon, SendIcon, ShieldCheckIcon } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";

type NavItem = { href: string; labelKey: "tools" | "myListings" | "myRequests" | "incoming" | "admin"; icon: LucideIcon };

const MEMBER_ITEMS: NavItem[] = [
  { href: routes.tools, labelKey: "tools", icon: LayoutGridIcon },
  { href: routes.myListings, labelKey: "myListings", icon: PackageIcon },
  { href: routes.myRequests, labelKey: "myRequests", icon: SendIcon },
  { href: routes.incoming, labelKey: "incoming", icon: InboxIcon },
];
const ADMIN_ITEM: NavItem = { href: routes.admin, labelKey: "admin", icon: ShieldCheckIcon };

export function getNavItems(showAdmin: boolean): NavItem[] {
  return showAdmin ? [...MEMBER_ITEMS, ADMIN_ITEM] : MEMBER_ITEMS;
}

/** Signed-in navigation: horizontal on desktop, vertical inside the mobile sheet. */
export function Nav({
  showAdmin = false,
  orientation = "horizontal",
  onNavigate,
}: {
  showAdmin?: boolean;
  orientation?: "horizontal" | "vertical";
  onNavigate?: () => void;
}) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const vertical = orientation === "vertical";

  return (
    <nav aria-label={t("label")}>
      <ul className={cn("flex", vertical ? "flex-col gap-1" : "items-center gap-1")}>
        {getNavItems(showAdmin).map(({ href, labelKey, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href}>
              <Link
                href={href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors",
                  vertical ? "h-11" : "h-9",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="size-4" aria-hidden="true" />
                {t(labelKey)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
