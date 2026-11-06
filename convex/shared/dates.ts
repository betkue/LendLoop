/**
 * Calendar-day helpers shared by Convex and the front-end.
 * Loan dates are stored as "YYYY-MM-DD" strings (no time, no time zone), which
 * compare correctly as plain strings.
 */

export type Day = string;

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** True for a real calendar date written as YYYY-MM-DD. */
export function isDay(value: string): value is Day {
  if (!DAY_PATTERN.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/** Formats a Date as YYYY-MM-DD using its UTC calendar day. */
export function toDay(date: Date): Day {
  return date.toISOString().slice(0, 10);
}

/** Today's calendar day (UTC). */
export function today(now: number = Date.now()): Day {
  return toDay(new Date(now));
}

/** Adds (or subtracts) whole days. */
export function addDays(day: Day, days: number): Day {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return toDay(date);
}

/** Two inclusive ranges overlap when each starts on or before the other ends. */
export function rangesOverlap(
  a: { startDate: Day; endDate: Day },
  b: { startDate: Day; endDate: Day },
): boolean {
  return a.startDate <= b.endDate && b.startDate <= a.endDate;
}

/** True when `day` falls inside the inclusive range. */
export function isWithin(day: Day, range: { startDate: Day; endDate: Day }): boolean {
  return range.startDate <= day && day <= range.endDate;
}
