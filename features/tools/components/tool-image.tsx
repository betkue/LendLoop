import Image from "next/image";
import type { Category } from "@/convex/shared/constants";
import { cn } from "@/lib/utils";
import { CATEGORY_ICONS } from "@/lib/category-icons";

/**
 * Tool photo in a fixed 4:3 frame, or the category icon when there is none.
 * Photos come from Convex storage (already sized by the uploader), so they are
 * served as-is instead of through the Next.js image optimizer.
 */
export function ToolImage({
  src,
  alt,
  category,
  className,
  sizes = "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw",
  priority = false,
}: {
  src: string | null;
  alt: string;
  category: Category;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  const Icon = CATEGORY_ICONS[category];
  return (
    <div className={cn("relative aspect-[4/3] overflow-hidden bg-muted", className)}>
      {src ? (
        <Image src={src} alt={alt} fill sizes={sizes} priority={priority} unoptimized className="object-cover" />
      ) : (
        <div className="grid size-full place-items-center text-muted-foreground">
          <Icon className="size-10" aria-hidden="true" />
        </div>
      )}
    </div>
  );
}
