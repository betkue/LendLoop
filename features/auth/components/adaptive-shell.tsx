"use client";

import type { ReactNode } from "react";
import { useConvexAuth } from "convex/react";
import { useTranslations } from "next-intl";
import { LogInIcon } from "lucide-react";
import { PublicShell } from "@/components/layout/public-shell";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { routes } from "@/lib/routes";
import { MemberShell } from "./member-shell";

/** Catalog pages are open to everyone: member frame when signed in, public frame otherwise. */
export function AdaptiveShell({ children }: { children: ReactNode }) {
  const t = useTranslations("auth");
  const { isAuthenticated, isLoading } = useConvexAuth();

  if (isAuthenticated) return <MemberShell>{children}</MemberShell>;
  return (
    <PublicShell
      actions={
        !isLoading && (
          <Button nativeButton={false} render={<Link href={routes.signIn} />} className="h-11 gap-2 sm:h-9">
            <LogInIcon aria-hidden="true" />
            <span className="hidden sm:inline">{t("signIn")}</span>
          </Button>
        )
      }
    >
      {children}
    </PublicShell>
  );
}
