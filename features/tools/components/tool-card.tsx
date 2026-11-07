import { useTranslations } from "next-intl";
import { ArrowUpRightIcon } from "lucide-react";
import { TrustedLenderBadge } from "@/components/shared/trusted-lender-badge";
import { Link } from "@/i18n/navigation";
import { routes } from "@/lib/routes";
import type { CatalogTool } from "../types";
import { AvailabilityBadge, CategoryBadge } from "./tool-badges";
import { ToolImage } from "./tool-image";

/**
 * Clickable product-style card. Visitors can click too: the tool page asks
 * them to sign in, then brings them back. The lender is shown to members only.
 */
export function ToolCard({ tool }: { tool: CatalogTool }) {
  const t = useTranslations("tools.browse");
  return (
    <Link
      href={routes.tool(tool._id)}
      className="group block cursor-pointer overflow-hidden rounded-xl border bg-card transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <div className="relative overflow-hidden">
        <ToolImage
          src={tool.imageUrl}
          alt={tool.name}
          category={tool.category}
          className="transition-transform duration-500 group-hover:scale-[1.04]"
        />
        <AvailabilityBadge available={tool.available} className="absolute top-3 left-3 bg-background/95 shadow-sm backdrop-blur" />
        <span className="absolute top-3 right-3 grid size-8 place-items-center rounded-full bg-background/90 opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
          <ArrowUpRightIcon className="size-4" aria-hidden="true" />
        </span>
      </div>
      <div className="space-y-2 p-4">
        <h3 className="line-clamp-1 font-medium group-hover:text-primary">{tool.name}</h3>
        <div className="flex flex-wrap items-center gap-2">
          <CategoryBadge category={tool.category} />
          {tool.trustedLender && <TrustedLenderBadge />}
        </div>
        {tool.ownerName && <p className="text-sm text-muted-foreground">{t("by", { name: tool.ownerName })}</p>}
      </div>
    </Link>
  );
}
