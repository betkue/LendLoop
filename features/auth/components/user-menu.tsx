"use client";

import { UserButton } from "@clerk/nextjs";
import { useTranslations } from "next-intl";
import { ShieldCheckIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useCurrentUser } from "../hooks/use-current-user";

/** Clerk account button, with an Admin badge for administrators. */
export function UserMenu() {
  const t = useTranslations("auth");
  const { isAdmin } = useCurrentUser();

  return (
    <div className="flex items-center gap-2">
      {isAdmin && (
        <Badge variant="outline" className="hidden gap-1 sm:inline-flex">
          <ShieldCheckIcon className="size-3.5" aria-hidden="true" />
          {t("adminBadge")}
        </Badge>
      )}
      <div className="grid size-11 place-items-center sm:size-9">
        <UserButton appearance={{ elements: { avatarBox: "size-8" } }} />
      </div>
    </div>
  );
}
