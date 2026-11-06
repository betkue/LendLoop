"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { DateRange, Matcher } from "react-day-picker";
import { CalendarDaysIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { dateToDay, dayToDate, formatRange, getDateFnsLocale } from "@/lib/dates";
import type { Day } from "@/convex/shared/dates";
import { cn } from "@/lib/utils";

export type DayRange = { startDate: Day; endDate: Day };

/**
 * Picks an inclusive date range. Past days and the `unavailable` ranges
 * (already-approved loans) cannot be selected.
 */
export function DateRangePicker({
  value,
  onChange,
  unavailable = [],
  id,
  invalid = false,
}: {
  value: DayRange | null;
  onChange: (value: DayRange | null) => void;
  unavailable?: DayRange[];
  id?: string;
  invalid?: boolean;
}) {
  const t = useTranslations("dateRange");
  const locale = useLocale();
  const [open, setOpen] = useState(false);

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const disabled: Matcher[] = [
    { before: startOfToday },
    ...unavailable.map((range) => ({ from: dayToDate(range.startDate), to: dayToDate(range.endDate) })),
  ];

  const selected: DateRange | undefined = value
    ? { from: dayToDate(value.startDate), to: dayToDate(value.endDate) }
    : undefined;

  function select(range: DateRange | undefined) {
    if (!range?.from) {
      onChange(null);
      return;
    }
    const from = dateToDay(range.from);
    const to = dateToDay(range.to ?? range.from);
    onChange({ startDate: from, endDate: to });
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            id={id}
            variant="outline"
            aria-invalid={invalid}
            className={cn(
              "h-11 w-full justify-start gap-2 font-normal sm:h-10",
              !value && "text-muted-foreground",
            )}
          />
        }
      >
        <CalendarDaysIcon aria-hidden="true" />
        {value ? formatRange(value.startDate, value.endDate, locale) : t("placeholder")}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          selected={selected}
          onSelect={select}
          disabled={disabled}
          excludeDisabled
          numberOfMonths={1}
          locale={getDateFnsLocale(locale)}
          autoFocus
        />
        {unavailable.length > 0 && (
          <p className="border-t px-3 py-2 text-xs text-muted-foreground">{t("unavailableHint")}</p>
        )}
      </PopoverContent>
    </Popover>
  );
}
