import { useTranslations } from "next-intl";
import { TrustedLenderBadge } from "@/components/shared/trusted-lender-badge";
import { Link } from "@/i18n/navigation";
import { routes } from "@/lib/routes";
import type { ToolCardData } from "../types";
import { AvailabilityBadge, CategoryBadge } from "./tool-badges";
import { ToolImage } from "./tool-image";

/** Clickable tool card: photo, name, category, availability and lender. */
export function ToolCard({ tool }: { tool: ToolCardData }) {
  const t = useTranslations("tools.browse");
  return (
    <Link
      href={routes.tool(tool._id)}
      className="group block overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <div className="relative">
        <ToolImage
          src={tool.imageUrl}
          alt={tool.name}
          category={tool.category}
          className="transition-transform duration-300 group-hover:scale-[1.03]"
        />
        <AvailabilityBadge available={tool.available} className="absolute top-3 left-3 shadow-sm" />
      </div>
      <div className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-1 font-medium">{tool.name}</h3>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <CategoryBadge category={tool.category} />
          {tool.trustedLender && <TrustedLenderBadge />}
        </div>
        <p className="text-sm text-muted-foreground">{t("by", { name: tool.ownerName })}</p>
      </div>
    </Link>
  );
}
