import type { LucideIcon } from "lucide-react";
import { BikeIcon, CookingPotIcon, HammerIcon, PackageIcon, SprayCanIcon, SproutIcon } from "lucide-react";
import type { Category } from "@/convex/shared/constants";

/** One icon per category, used on cards, filters and photo placeholders. */
export const CATEGORY_ICONS: Record<Category, LucideIcon> = {
  diy: HammerIcon,
  garden: SproutIcon,
  kitchen: CookingPotIcon,
  cleaning: SprayCanIcon,
  sports: BikeIcon,
  other: PackageIcon,
};
