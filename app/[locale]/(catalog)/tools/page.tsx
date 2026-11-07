import { Suspense } from "react";
import { LoadingSkeleton } from "@/components/shared/states";
import { CatalogView } from "@/features/tools";

export default function ToolsPage() {
  return (
    <Suspense fallback={<LoadingSkeleton count={8} />}>
      <CatalogView mode={{ kind: "all" }} />
    </Suspense>
  );
}
