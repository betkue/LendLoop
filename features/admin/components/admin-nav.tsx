"use client";

import { useTranslations } from "next-intl";
import { ClipboardListIcon, UsersIcon } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";

/** Admin section switcher: loans and members. */
export function AdminNav() {
  const t = useTranslations("admin");
  const pathname = usePathname();
  const items = [
    { href: routes.admin, label: t("navLoans"), icon: ClipboardListIcon },
    { href: routes.adminUsers, label: t("navUsers"), icon: UsersIcon },
  ];
  return (
    <nav aria-label={t("title")} className="flex gap-1 rounded-lg bg-muted p-1 sm:w-max">
      {items.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex h-10 flex-1 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium transition-colors",
              active ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
