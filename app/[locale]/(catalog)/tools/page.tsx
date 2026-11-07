import { Suspense } from "react";
import { LoadingSkeleton } from "@/components/shared/states";
import { ToolsBrowser } from "@/features/tools";

export default function ToolsPage() {
  // ToolsBrowser reads ?category= from the URL, which needs a Suspense boundary.
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <ToolsBrowser />
    </Suspense>
  );
}
