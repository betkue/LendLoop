"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { CalendarPlusIcon, Loader2Icon } from "lucide-react";
import { DateRangePicker, type DayRange } from "@/components/shared/date-range-picker";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { Id } from "@/convex/_generated/dataModel";
import { useRouter } from "@/i18n/navigation";
import { routes } from "@/lib/routes";
import { useLoanActions } from "../hooks/use-loan-actions";
import { useBookedRanges } from "../hooks/use-loans";
import { makeLoanRequestSchema } from "../schemas";

/**
 * Borrowing panel shown beside a tool. Already-approved periods are greyed
 * out; Convex re-checks dates and overlaps when the request is sent.
 */
export function RequestForm({ toolId }: { toolId: Id<"tools"> }) {
  const t = useTranslations("loans.request");
  const router = useRouter();
  const booked = useBookedRanges(toolId);
  const { request } = useLoanActions();
  const [range, setRange] = useState<DayRange | null>(null);
  const [error, setError] = useState<string | null>(null);
  const schema = useMemo(() => makeLoanRequestSchema((key) => t(`errors.${key}`)), [t]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = schema.safeParse(range);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? t("errors.datesRequired"));
      return;
    }
    setError(null);
    const outcome = await request.mutate({ toolId, ...parsed.data });
    if (outcome.ok) router.push(routes.myRequests);
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-xl border p-5" noValidate>
      <div className="space-y-1">
        <h2 className="font-semibold">{t("title")}</h2>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="loan-dates">{t("dates")}</Label>
        <DateRangePicker
          id="loan-dates"
          value={range}
          onChange={(next) => {
            setRange(next);
            setError(null);
          }}
          unavailable={booked ?? []}
          invalid={Boolean(error)}
        />
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
      <Button type="submit" className="h-11 w-full gap-2 sm:h-10" disabled={request.isPending}>
        {request.isPending ? (
          <Loader2Icon className="animate-spin" aria-hidden="true" />
        ) : (
          <CalendarPlusIcon aria-hidden="true" />
        )}
        {t("submit")}
      </Button>
    </form>
  );
}
