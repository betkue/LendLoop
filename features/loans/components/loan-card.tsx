import type { ReactNode } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { CalendarDaysIcon, PackageIcon } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { formatRange } from "@/lib/dates";
import { routes } from "@/lib/routes";
import type { MyRequest } from "../types";
import { LoanStatusBadge } from "./loan-status-badge";

/**
 * One loan as a card: tool photo and name, dates, status, the other party,
 * then module-specific actions and details passed by the list.
 */
export function LoanCard({
  loan,
  subtitle,
  actions,
  children,
}: {
  loan: MyRequest;
  subtitle: string;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  const t = useTranslations("loans");
  const locale = useLocale();
  const title = loan.toolExists ? (
    <Link href={routes.tool(loan.toolId)} className="hover:underline">
      {loan.toolName}
    </Link>
  ) : (
    <span>
      {loan.toolName} <span className="text-sm font-normal text-muted-foreground">({t("toolRemoved")})</span>
    </span>
  );

  return (
    <article className="flex flex-col gap-4 rounded-xl border bg-card p-4 sm:flex-row sm:items-center">
      <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-lg bg-muted sm:w-32">
        {loan.imageUrl ? (
          <Image src={loan.imageUrl} alt="" fill sizes="128px" unoptimized className="object-cover" />
        ) : (
          <div className="grid size-full place-items-center text-muted-foreground">
            <PackageIcon className="size-8" aria-hidden="true" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-medium">{title}</h3>
          <LoanStatusBadge loan={loan} />
        </div>
        <p className="flex items-center gap-2 text-sm">
          <CalendarDaysIcon className="size-4 text-muted-foreground" aria-hidden="true" />
          {formatRange(loan.startDate, loan.endDate, locale)}
        </p>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
        {children}
      </div>
      {actions && <div className="flex flex-wrap gap-2 sm:flex-col sm:items-stretch">{actions}</div>}
    </article>
  );
}
