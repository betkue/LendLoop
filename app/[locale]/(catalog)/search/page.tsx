import { Suspense } from "react";
import { LoadingSkeleton } from "@/components/shared/states";
import { CatalogView } from "@/features/tools";

// Search results for ?q=…, open to visitors.
export default function SearchPage() {
  return (
    <Suspense fallback={<LoadingSkeleton count={8} />}>
      <CatalogView mode={{ kind: "search" }} />
    </Suspense>
  );
}
