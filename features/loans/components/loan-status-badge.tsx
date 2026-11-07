import { useTranslations } from "next-intl";
import type { LucideIcon } from "lucide-react";
import {
  AlarmClockIcon,
  BanIcon,
  CircleCheckIcon,
  ClockIcon,
  RotateCcwIcon,
  XCircleIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { LoanStatus } from "@/convex/shared/constants";
import { displayStatus, type DisplayStatus } from "@/convex/shared/loanRules";
import { cn } from "@/lib/utils";

const STYLES: Record<DisplayStatus, { icon: LucideIcon; className: string }> = {
  pending: { icon: ClockIcon, className: "bg-sky-500/10 text-sky-700 dark:text-sky-400" },
  approved: { icon: CircleCheckIcon, className: "bg-primary/10 text-primary" },
  overdue: { icon: AlarmClockIcon, className: "bg-destructive/10 text-destructive" },
  returned: { icon: RotateCcwIcon, className: "bg-muted text-muted-foreground" },
  declined: { icon: XCircleIcon, className: "bg-muted text-muted-foreground" },
  cancelled: { icon: BanIcon, className: "bg-muted text-muted-foreground" },
};

/** Status of a loan, with "overdue" computed from the dates (never stored). */
export function LoanStatusBadge({
  loan,
  className,
}: {
  loan: { status: LoanStatus; endDate: string };
  className?: string;
}) {
  const t = useTranslations("loans.status");
  const status = displayStatus(loan);
  const { icon: Icon, className: tone } = STYLES[status];
  return (
    <Badge variant="secondary" className={cn("gap-1", tone, className)}>
      <Icon className="size-3.5" aria-hidden="true" />
      {t(status)}
    </Badge>
  );
}
