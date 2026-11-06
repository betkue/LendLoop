import { useTranslations } from "next-intl";
import { BadgeCheckIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/** Marks listings from lenders an admin has flagged as trusted. Purely informative. */
export function TrustedLenderBadge({ className }: { className?: string }) {
  const t = useTranslations("common");
  return (
    <Badge variant="secondary" className={cn("gap-1 text-primary", className)}>
      <BadgeCheckIcon className="size-3.5" aria-hidden="true" />
      {t("trustedLender")}
    </Badge>
  );
}
