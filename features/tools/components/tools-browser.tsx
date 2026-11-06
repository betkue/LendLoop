"use client";

import { useTranslations } from "next-intl";
import { PlusIcon, SearchXIcon } from "lucide-react";
import { Stagger, StaggerItem, PageTransition } from "@/components/shared/motion";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, LoadingSkeleton } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { CATEGORIES, type Category } from "@/convex/shared/constants";
import { useSearchParam } from "@/hooks/use-search-param";
import { Link } from "@/i18n/navigation";
import { routes } from "@/lib/routes";
import { useTools } from "../hooks/use-tools";
import { CategoryFilter } from "./category-filter";
import { ToolCard } from "./tool-card";

function toCategory(value: string | null): Category | null {
  return (CATEGORIES as readonly string[]).includes(value ?? "") ? (value as Category) : null;
}

/** "Browse tools": category filter kept in the URL (?category=) and a live grid. */
export function ToolsBrowser() {
  const t = useTranslations("tools.browse");
  const [param, setParam] = useSearchParam("category");
  const category = toCategory(param);
  const tools = useTools(category);

  return (
    <PageTransition className="space-y-6">
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
        action={
          <Button nativeButton={false} render={<Link href={routes.newTool} />} className="h-11 gap-2 sm:h-9">
            <PlusIcon aria-hidden="true" />
            {t("listTool")}
          </Button>
        }
      />
      <CategoryFilter value={category} onChange={(next) => setParam(next)} />

      {tools === undefined ? (
        <LoadingSkeleton />
      ) : tools.length === 0 ? (
        <EmptyState icon={SearchXIcon} title={t("emptyTitle")} description={t("emptyDescription")} />
      ) : (
        <Stagger key={category ?? "all"} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((tool) => (
            <StaggerItem key={tool._id}>
              <ToolCard tool={tool} />
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </PageTransition>
  );
}
