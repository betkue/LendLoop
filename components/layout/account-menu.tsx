"use client";

import { useTranslations } from "next-intl";
import { ChevronDownIcon, LayoutDashboardIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "@/i18n/navigation";
import { getNavItems } from "./nav";

/** "My space" dropdown on desktop: my listings, my requests, incoming requests, admin. */
export function AccountMenu({ showAdmin = false }: { showAdmin?: boolean }) {
  const t = useTranslations();
  const router = useRouter();
  const items = getNavItems(showAdmin).filter((item) => item.labelKey !== "tools");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" className="h-9 gap-2 px-3" />}>
        <LayoutDashboardIcon aria-hidden="true" />
        {t("header.mySpace")}
        <ChevronDownIcon className="size-4 opacity-60" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {items.map(({ href, labelKey, icon: Icon }) => (
          <DropdownMenuItem key={href} onClick={() => router.push(href)} className="h-9 gap-2">
            <Icon className="size-4" aria-hidden="true" />
            {t(`nav.${labelKey}`)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
