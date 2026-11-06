"use client";

import { useTranslations } from "next-intl";
import { PackageIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { PageTransition } from "@/components/shared/motion";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, LoadingSkeleton } from "@/components/shared/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { routes } from "@/lib/routes";
import { useToolMutations } from "../hooks/use-tool-mutations";
import { useMyListings } from "../hooks/use-tools";
import type { MyListing } from "../types";
import { AvailabilityBadge, CategoryBadge } from "./tool-badges";
import { ToolImage } from "./tool-image";

/** "My listings": the user's tools with their status, pending requests and actions. */
export function MyListings() {
  const t = useTranslations("tools");
  const tCommon = useTranslations("common");
  const listings = useMyListings();
  const { remove } = useToolMutations();

  const newToolButton = (
    <Button nativeButton={false} render={<Link href={routes.newTool} />} className="h-11 gap-2 sm:h-9">
      <PlusIcon aria-hidden="true" />
      {t("browse.listTool")}
    </Button>
  );

  const columns: DataTableColumn<MyListing>[] = [
    {
      key: "tool",
      header: t("listings.colTool"),
      cell: (tool) => (
        <Link href={routes.tool(tool._id)} className="flex items-center gap-3 font-medium hover:underline">
          <ToolImage src={tool.imageUrl} alt="" category={tool.category} className="w-16 shrink-0 rounded-md" sizes="64px" />
          <span className="line-clamp-2 text-left">{tool.name}</span>
        </Link>
      ),
    },
    { key: "category", header: t("listings.colCategory"), cell: (tool) => <CategoryBadge category={tool.category} /> },
    { key: "status", header: t("listings.colStatus"), cell: (tool) => <AvailabilityBadge available={tool.available} /> },
    {
      key: "requests",
      header: t("listings.colRequests"),
      cell: (tool) =>
        tool.pendingRequests > 0 ? (
          <Badge>{tool.pendingRequests}</Badge>
        ) : (
          <span className="text-muted-foreground">0</span>
        ),
    },
    {
      key: "actions",
      header: t("listings.colActions"),
      isAction: true,
      cell: (tool) => (
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href={routes.editTool(tool._id)} />}
            className="h-11 gap-1 sm:h-8"
          >
            <PencilIcon aria-hidden="true" />
            {tCommon("edit")}
          </Button>
          {tool.hasActiveLoan ? (
            <Button variant="ghost" disabled className="h-11 gap-1 sm:h-8" title={t("listings.deleteBlocked")}>
              <Trash2Icon aria-hidden="true" />
              {tCommon("delete")}
            </Button>
          ) : (
            <ConfirmDialog
              trigger={
                <Button variant="ghost" className="h-11 gap-1 text-destructive hover:text-destructive sm:h-8">
                  <Trash2Icon aria-hidden="true" />
                  {tCommon("delete")}
                </Button>
              }
              title={t("listings.deleteTitle")}
              description={t("listings.deleteDescription")}
              confirmLabel={tCommon("delete")}
              destructive
              onConfirm={() => remove.mutate({ toolId: tool._id })}
            />
          )}
        </div>
      ),
    },
  ];

  return (
    <PageTransition className="space-y-6">
      <PageHeader title={t("listings.title")} description={t("listings.subtitle")} action={newToolButton} />
      {listings === undefined ? (
        <LoadingSkeleton count={3} />
      ) : listings.length === 0 ? (
        <EmptyState
          icon={PackageIcon}
          title={t("listings.emptyTitle")}
          description={t("listings.emptyDescription")}
          action={newToolButton}
        />
      ) : (
        <DataTable columns={columns} rows={listings} getRowKey={(tool) => tool._id} />
      )}
    </PageTransition>
  );
}
