import { Suspense } from "react";
import { notFound } from "next/navigation";
import { LoadingSkeleton } from "@/components/shared/states";
import { CATEGORIES, type Category } from "@/convex/shared/constants";
import { CatalogView } from "@/features/tools";

// One page per category, prerendered for every locale.
export function generateStaticParams() {
  return CATEGORIES.map((category) => ({ category }));
}

export default async function CategoryPage({ params }: PageProps<"/[locale]/categories/[category]">) {
  const { category } = await params;
  if (!(CATEGORIES as readonly string[]).includes(category)) notFound();
  return (
    <Suspense fallback={<LoadingSkeleton count={8} />}>
      <CatalogView mode={{ kind: "category", category: category as Category }} />
    </Suspense>
  );
}
