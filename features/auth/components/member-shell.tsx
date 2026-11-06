"use client";

import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { useCurrentUser } from "../hooks/use-current-user";
import { useEnsureUser } from "../hooks/use-ensure-user";
import { useLocaleSync } from "../hooks/use-locale-sync";
import { UserMenu } from "./user-menu";

/**
 * Frame of every signed-in page: makes sure the Convex user exists, shows the
 * Admin link to admins and keeps the notification language in sync with the UI.
 */
export function MemberShell({ children }: { children: ReactNode }) {
  useEnsureUser();
  const { isAdmin } = useCurrentUser();
  const syncLocale = useLocaleSync();

  return (
    <AppShell userMenu={<UserMenu />} showAdmin={isAdmin} onLocaleChange={syncLocale}>
      {children}
    </AppShell>
  );
}
