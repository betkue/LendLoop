"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { formatRelative } from "@/lib/dates";

/**
 * "2 days ago" in the active language, refreshed every minute.
 * The exact date stays available in the tooltip and to assistive tech.
 */
export function RelativeTime({ timestamp, className }: { timestamp: number; className?: string }) {
  const locale = useLocale();
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((tick) => tick + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const date = new Date(timestamp);
  return (
    <time
      dateTime={date.toISOString()}
      title={date.toLocaleString(locale)}
      className={className}
      suppressHydrationWarning
    >
      {formatRelative(timestamp, locale)}
    </time>
  );
}
