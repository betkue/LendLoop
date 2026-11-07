"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { PlusIcon, SearchXIcon } from "lucide-react";
import { PageTransition, Stagger, StaggerItem } from "@/components/shared/motion";
import { EmptyState, LoadingSkeleton } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import type { Category } from "@/convex/shared/constants";
import { Link } from "@/i18n/navigation";
import { CATEGORY_ICONS } from "@/lib/category-icons";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { useCatalog } from "../hooks/use-tools";
import type { CatalogTool } from "../types";
import { ToolCard } from "./tool-card";

type Mode = { kind: "all" } | { kind: "category"; category: Category } | { kind: "search" };

const sorters: Record<"newest" | "available" | "name", (a: CatalogTool, b: CatalogTool) => number> = {
  newest: () => 0, // the query already returns newest first
  available: (a, b) => Number(b.available) - Number(a.available),
  name: (a, b) => a.name.localeCompare(b.name),
};

/**
 * Store-style catalog: all tools, one category or search results, with an
 * "available only" toggle and sorting. Open to visitors.
 */
export function CatalogView({ mode }: { mode: Mode }) {
  const t = useTranslations("catalog");
  const tCategories = useTranslations("tools.categories");
  const searchParams = useSearchParams();
  const query = mode.kind === "search" ? (searchParams.get("q") ?? "").trim() : "";
  const category = mode.kind === "category" ? mode.category : null;
  const tools = useCatalog({ category, search: query || null });
  const [availableOnly, setAvailableOnly] = useState(false);
  const [sort, setSort] = useState<keyof typeof sorters>("newest");

  const visible = tools
    ?.filter((tool) => !availableOnly || tool.available)
    .slice()
    .sort(sorters[sort]);

  const Icon = category ? CATEGORY_ICONS[category] : null;
  const title =
    mode.kind === "category"
      ? tCategories(mode.category)
      : mode.kind === "search"
        ? query
          ? t("searchTitle", { query })
          : t("searchEmptyTitle")
        : t("allTitle");
  const subtitle =
    mode.kind === "category" ? t(`categoryIntro.${mode.category}`) : mode.kind === "search" ? undefined : t("allSubtitle");

  return (
    <PageTransition className="space-y-6">
      <div className="flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-start gap-4">
          {Icon && (
            <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <Icon className="size-6" aria-hidden="true" />
            </span>
          )}
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
            {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
            {visible && <p className="text-sm text-muted-foreground">{t("count", { count: visible.length })}</p>}
          </div>
        </div>
        <Button nativeButton={false} render={<Link href={routes.newTool} />} className="h-11 gap-2 sm:h-9">
          <PlusIcon aria-hidden="true" />
          {t("listTool")}
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={availableOnly}
          onClick={() => setAvailableOnly((value) => !value)}
          className={cn(
            "inline-flex h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors sm:h-9",
            availableOnly ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted",
          )}
        >
          <span
            className={cn(
              "relative h-4 w-7 rounded-full transition-colors",
              availableOnly ? "bg-primary" : "bg-muted-foreground/30",
            )}
            aria-hidden="true"
          >
            <span
              className={cn(
                "absolute top-0.5 size-3 rounded-full bg-white transition-all",
                availableOnly ? "left-3.5" : "left-0.5",
              )}
            />
          </span>
          {t("availableOnly")}
        </button>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          {t("sortBy")}
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as keyof typeof sorters)}
            className="h-11 cursor-pointer rounded-lg border bg-background px-3 text-sm text-foreground sm:h-9"
          >
            <option value="newest">{t("sortNewest")}</option>
            <option value="available">{t("sortAvailable")}</option>
            <option value="name">{t("sortName")}</option>
          </select>
        </label>
      </div>

      {visible === undefined ? (
        <LoadingSkeleton count={8} className="lg:grid-cols-4" />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={SearchXIcon}
          title={mode.kind === "search" ? t("noResults") : t("emptyTitle")}
          description={t("emptyDescription")}
          action={
            <Button variant="outline" nativeButton={false} render={<Link href={routes.tools} />} className="h-11 sm:h-9">
              {t("seeAll")}
            </Button>
          }
        />
      ) : (
        <Stagger
          key={`${mode.kind}-${category ?? ""}-${query}-${availableOnly}-${sort}`}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {visible.map((tool) => (
            <StaggerItem key={tool._id}>
              <ToolCard tool={tool} />
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </PageTransition>
  );
}
