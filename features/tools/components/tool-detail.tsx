"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeftIcon, PackageXIcon, PencilIcon, UserRoundIcon } from "lucide-react";
import { PageTransition } from "@/components/shared/motion";
import { ErrorState } from "@/components/shared/states";
import { TrustedLenderBadge } from "@/components/shared/trusted-lender-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Id } from "@/convex/_generated/dataModel";
import { Link } from "@/i18n/navigation";
import { routes } from "@/lib/routes";
import { useTool } from "../hooks/use-tools";
import type { ToolCardData } from "../types";
import { AvailabilityBadge, CategoryBadge } from "./tool-badges";
import { ToolImage } from "./tool-image";

/**
 * Tool page: photo, details and lender. `aside` receives the tool and renders
 * the borrowing panel; the page composes it from the loans module so tools
 * never imports loans.
 */
export function ToolDetail({
  toolId,
  aside,
}: {
  toolId: Id<"tools">;
  aside?: (tool: ToolCardData) => ReactNode;
}) {
  const t = useTranslations("tools");
  const tool = useTool(toolId);

  if (tool === undefined) {
    return (
      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <Skeleton className="aspect-[4/3] rounded-xl" />
        <div className="space-y-4">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  if (tool === null) {
    return (
      <ErrorState
        icon={PackageXIcon}
        title={t("detail.notFoundTitle")}
        description={t("detail.notFoundDescription")}
        action={
          <Button variant="outline" nativeButton={false} render={<Link href={routes.tools} />}>
            {t("detail.backToTools")}
          </Button>
        }
      />
    );
  }

  return (
    <PageTransition className="space-y-6">
      <Button variant="ghost" nativeButton={false} render={<Link href={routes.tools} />} className="-ml-3 h-11 gap-2 sm:h-9">
        <ArrowLeftIcon aria-hidden="true" />
        {t("detail.backToTools")}
      </Button>

      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <ToolImage
            src={tool.imageUrl}
            alt={tool.name}
            category={tool.category}
            className="rounded-xl border"
            sizes="(min-width: 1024px) 60vw, 100vw"
            priority
          />
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <CategoryBadge category={tool.category} />
              <AvailabilityBadge available={tool.available} />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{tool.name}</h1>
            {tool.description && <p className="whitespace-pre-line text-muted-foreground">{tool.description}</p>}
          </div>
          <dl className="grid gap-4 rounded-xl border p-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-muted-foreground">{t("detail.condition")}</dt>
              <dd className="font-medium">{t(`conditions.${tool.condition}`)}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">{t("detail.owner")}</dt>
              <dd className="flex flex-wrap items-center gap-2 font-medium">
                <UserRoundIcon className="size-4 text-muted-foreground" aria-hidden="true" />
                {tool.ownerName}
                {tool.trustedLender && <TrustedLenderBadge />}
              </dd>
            </div>
          </dl>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          {tool.isMine ? (
            <div className="space-y-4 rounded-xl border p-5">
              <p className="font-medium">{t("detail.yours")}</p>
              <Button nativeButton={false} render={<Link href={routes.editTool(tool._id)} />} className="h-11 w-full gap-2 sm:h-10">
                <PencilIcon aria-hidden="true" />
                {t("detail.edit")}
              </Button>
            </div>
          ) : (
            aside?.(tool)
          )}
        </aside>
      </div>
    </PageTransition>
  );
}
