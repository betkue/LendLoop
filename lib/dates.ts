import { de, enUS, fr, zhCN, type Locale as DateFnsLocale } from "date-fns/locale";
import { format, formatDistanceToNowStrict } from "date-fns";
import type { Locale } from "@/i18n/routing";
import type { Day } from "@/convex/shared/dates";

const DATE_FNS_LOCALES: Record<Locale, DateFnsLocale> = { en: enUS, fr, zh: zhCN, de };

export function getDateFnsLocale(locale: Locale): DateFnsLocale {
  return DATE_FNS_LOCALES[locale];
}

/** Parses a YYYY-MM-DD day as a local Date at midnight (for calendars and display). */
export function dayToDate(day: Day): Date {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(year, month - 1, date);
}

/** Formats a local Date (from a calendar) back to YYYY-MM-DD without UTC shifting. */
export function dateToDay(date: Date): Day {
  return format(date, "yyyy-MM-dd");
}

/** "12 Nov 2026" in the active language. */
export function formatDay(day: Day, locale: Locale): string {
  return format(dayToDate(day), "PP", { locale: getDateFnsLocale(locale) });
}

/** "Nov 10 – Nov 12, 2026" style range in the active language. */
export function formatRange(startDate: Day, endDate: Day, locale: Locale): string {
  const options = { locale: getDateFnsLocale(locale) };
  return `${format(dayToDate(startDate), "PP", options)} – ${format(dayToDate(endDate), "PP", options)}`;
}

/** "2 days ago" in the active language, from a millisecond timestamp. */
export function formatRelative(timestamp: number, locale: Locale): string {
  return formatDistanceToNowStrict(timestamp, { addSuffix: true, locale: getDateFnsLocale(locale) });
}
