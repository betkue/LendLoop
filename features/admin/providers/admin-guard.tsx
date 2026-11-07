"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { ShieldXIcon } from "lucide-react";
import { ErrorState, LoadingSkeleton } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { routes } from "@/lib/routes";
import { useIsAdmin } from "../hooks/use-admin";

/**
 * Shows admin pages to admins only. This is a convenience: every admin Convex
 * function checks the role again and refuses non-admins.
 */
export function AdminGuard({ children }: { children: ReactNode }) {
  const t = useTranslations("admin");
  const isAdmin = useIsAdmin();

  if (isAdmin === undefined) return <LoadingSkeleton count={3} />;
  if (!isAdmin) {
    return (
      <ErrorState
        icon={ShieldXIcon}
        title={t("forbiddenTitle")}
        description={t("forbiddenDescription")}
        action={
          <Button variant="outline" nativeButton={false} render={<Link href={routes.tools} />}>
            {t("backToTools")}
          </Button>
        }
      />
    );
  }
  return children;
}
