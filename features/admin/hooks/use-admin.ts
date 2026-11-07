"use client";

import { useConvexAuth, useQuery } from "convex/react";
import { useTranslations } from "next-intl";
import { api } from "@/convex/_generated/api";
import type { LoanStatus } from "@/convex/shared/constants";
import { useMemberQuery } from "@/hooks/use-member-query";
import { useSafeMutation } from "@/hooks/use-safe-mutation";

/** undefined while loading, then whether the signed-in user is an admin (UI hint only). */
export function useIsAdmin(): boolean | undefined {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const me = useQuery(api.users.me, isAuthenticated ? {} : "skip");
  if (isLoading || (isAuthenticated && me === undefined)) return undefined;
  return me?.role === "admin";
}

export function useAllLoans(status: LoanStatus | null) {
  return useMemberQuery(api.admin.allLoans, status ? { status } : {});
}

export function useAdminUsers() {
  return useMemberQuery(api.admin.users);
}

export function useAdminActions() {
  const t = useTranslations("admin.toasts");
  return {
    removeTool: useSafeMutation(api.admin.removeTool, { successMessage: t("toolRemoved") }),
    setTrustedLender: useSafeMutation(api.admin.setTrustedLender, { successMessage: t("badgeUpdated") }),
  };
}
