import { LoadingSkeleton } from "@/components/shared/states";
import { Skeleton } from "@/components/ui/skeleton";

// Shown inside the member frame while a page's code loads.
export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2 border-b pb-6">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-72" />
      </div>
      <LoadingSkeleton />
    </div>
  );
}
