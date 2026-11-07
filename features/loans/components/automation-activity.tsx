"use client";

import { useTranslations } from "next-intl";
import type { LucideIcon } from "lucide-react";
import { AlarmClockIcon, BellIcon, CalendarClockIcon, TriangleAlertIcon } from "lucide-react";
import { RelativeTime } from "@/components/shared/relative-time";
import type { Id } from "@/convex/_generated/dataModel";
import type { AUTOMATION_EVENT_TYPES } from "@/convex/shared/validators";
import { useAutomationActivity } from "../hooks/use-loans";

type EventType = (typeof AUTOMATION_EVENT_TYPES)[number];

const ICONS: Record<EventType, LucideIcon> = {
  notification_sent: BellIcon,
  due_tomorrow_reminder_sent: CalendarClockIcon,
  overdue_reminder_sent: AlarmClockIcon,
  automation_failed: TriangleAlertIcon,
};

/** Recent automation activity of a loan: "Reminder sent 2 days ago", live. */
export function AutomationActivity({ loanId }: { loanId: Id<"loans"> }) {
  const t = useTranslations("loans.activity");
  const events = useAutomationActivity(loanId);
  if (!events || events.length === 0) return null;

  return (
    <div className="rounded-lg bg-muted/60 p-3">
      <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">{t("title")}</p>
      <ul className="space-y-1.5">
        {events.slice(0, 3).map((event) => {
          const Icon = ICONS[event.type];
          return (
            <li key={event._id} className="flex items-center gap-2 text-sm">
              <Icon
                className={event.type === "automation_failed" ? "size-4 text-destructive" : "size-4 text-muted-foreground"}
                aria-hidden="true"
              />
              <span>{t(event.type)}</span>
              <RelativeTime timestamp={event.at} className="text-muted-foreground" />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
