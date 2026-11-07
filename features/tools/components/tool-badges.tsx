import { useTranslations } from "next-intl";
import { CircleCheckIcon, CircleDotIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Category } from "@/convex/shared/constants";
import { cn } from "@/lib/utils";
import { CATEGORY_ICONS } from "@/lib/category-icons";

export function CategoryBadge({ category, className }: { category: Category; className?: string }) {
  const t = useTranslations("tools.categories");
  const Icon = CATEGORY_ICONS[category];
  return (
    <Badge variant="outline" className={cn("gap-1 font-normal", className)}>
      <Icon className="size-3.5" aria-hidden="true" />
      {t(category)}
    </Badge>
  );
}

export function AvailabilityBadge({ available, className }: { available: boolean; className?: string }) {
  const t = useTranslations("tools.availability");
  return (
    <Badge
      variant="secondary"
      className={cn(
        "gap-1",
        available ? "bg-primary/10 text-primary" : "bg-amber-500/10 text-amber-700 dark:text-amber-400",
        className,
      )}
    >
      {available ? (
        <CircleCheckIcon className="size-3.5" aria-hidden="true" />
      ) : (
        <CircleDotIcon className="size-3.5" aria-hidden="true" />
      )}
      {available ? t("available") : t("onLoan")}
    </Badge>
  );
}
