"use client";

import { useTranslations } from "next-intl";
import { BadgeCheckIcon, ShieldCheckIcon, UsersIcon } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { PageTransition } from "@/components/shared/motion";
import { EmptyState, LoadingSkeleton } from "@/components/shared/states";
import { TrustedLenderBadge } from "@/components/shared/trusted-lender-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAdminActions, useAdminUsers } from "../hooks/use-admin";
import type { AdminUser } from "../types";

/** Members with role and listings; admins grant or remove the Trusted Lender badge. */
export function UsersAdmin() {
  const t = useTranslations("admin");
  const users = useAdminUsers();
  const { setTrustedLender } = useAdminActions();

  const columns: DataTableColumn<AdminUser>[] = [
    {
      key: "name",
      header: t("colMember"),
      cell: (user) => (
        <div className="text-left">
          <p className="font-medium">{user.name}</p>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>
      ),
    },
    {
      key: "role",
      header: t("colRole"),
      cell: (user) =>
        user.role === "admin" ? (
          <Badge variant="outline" className="gap-1">
            <ShieldCheckIcon className="size-3.5" aria-hidden="true" />
            {t("roleAdmin")}
          </Badge>
        ) : (
          <span className="text-muted-foreground">{t("roleUser")}</span>
        ),
    },
    { key: "tools", header: t("colListings"), cell: (user) => user.toolCount },
    {
      key: "badge",
      header: t("colBadge"),
      cell: (user) => (user.trustedLender ? <TrustedLenderBadge /> : <span className="text-muted-foreground">—</span>),
    },
    {
      key: "actions",
      header: t("colActions"),
      isAction: true,
      cell: (user) => (
        <Button
          variant={user.trustedLender ? "outline" : "default"}
          className="h-11 gap-1 sm:h-8"
          disabled={setTrustedLender.isPending}
          onClick={() => setTrustedLender.mutate({ userId: user._id, trusted: !user.trustedLender })}
        >
          <BadgeCheckIcon aria-hidden="true" />
          {user.trustedLender ? t("removeBadge") : t("grantBadge")}
        </Button>
      ),
    },
  ];

  return (
    <PageTransition>
      {users === undefined ? (
        <LoadingSkeleton count={3} />
      ) : users.length === 0 ? (
        <EmptyState icon={UsersIcon} title={t("emptyUsers")} />
      ) : (
        <DataTable columns={columns} rows={users} getRowKey={(user) => user._id} />
      )}
    </PageTransition>
  );
}
