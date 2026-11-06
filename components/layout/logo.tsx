import { Repeat2Icon } from "lucide-react";
import { cn } from "@/lib/utils";

/** LendLoop wordmark: a flat accent tile with the loop icon, followed by the name. */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-semibold tracking-tight", className)}>
      <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
        <Repeat2Icon className="size-5" aria-hidden="true" />
      </span>
      <span className="text-lg">LendLoop</span>
    </span>
  );
}
