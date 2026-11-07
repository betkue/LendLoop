"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ClipboardListIcon } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { PageTransition } from "@/components/shared/motion";
import { EmptyState, LoadingSkeleton } from "@/components/shared/states";
import { Badge } from "@/components/ui/badge";
import { LOAN_STATUSES, type LoanStatus } from "@/convex/shared/constants";
import { displayStatus, isOverdue, type DisplayStatus } from "@/convex/shared/loanRules";
import { Link } from "@/i18n/navigation";
import { formatRange } from "@/lib/dates";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { useAllLoans } from "../hooks/use-admin";
import type { AdminLoan } from "../types";

type Filter = DisplayStatus | "all";
const FILTERS: Filter[] = ["all", "overdue", ...LOAN_STATUSES];

/** Every loan with a status filter, overdue included (computed from the dates). */
export function AllLoans() {
  const t = useTranslations("admin");
  const tStatus = useTranslations("loans.status");
  const locale = useLocale();
  const [filter, setFilter] = useState<Filter>("all");

  // Overdue is computed, so it filters approved loans on the client.
  const stored: LoanStatus | null = filter === "all" ? null : filter === "overdue" ? "approved" : filter;
  const loans = useAllLoans(stored);
  const rows =
    filter === "overdue" ? loans?.filter((loan) => isOverdue(loan)) : filter === "approved" ? loans?.filter((loan) => !isOverdue(loan)) : loans;

  const columns: DataTableColumn<AdminLoan>[] = [
    {
      key: "tool",
      header: t("colTool"),
      cell: (loan) =>
        loan.toolExists ? (
          <Link href={routes.tool(loan.toolId)} className="font-medium hover:underline">
            {loan.toolName}
          </Link>
        ) : (
          <span className="text-muted-foreground">{loan.toolName}</span>
        ),
    },
    { key: "owner", header: t("colOwner"), cell: (loan) => loan.ownerName },
    { key: "borrower", header: t("colBorrower"), cell: (loan) => loan.borrowerName },
    { key: "dates", header: t("colDates"), cell: (loan) => formatRange(loan.startDate, loan.endDate, locale) },
    {
      key: "status",
      header: t("colStatus"),
      cell: (loan) => {
        const status = displayStatus(loan);
        return <Badge variant={status === "overdue" ? "destructive" : "secondary"}>{tStatus(status)}</Badge>;
      },
    },
  ];

  return (
    <PageTransition className="space-y-4">
      <div role="radiogroup" aria-label={t("filterLabel")} className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div className="flex w-max gap-2 pb-1">
          {FILTERS.map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={filter === option}
              onClick={() => setFilter(option)}
              className={cn(
                "h-11 rounded-full border px-4 text-sm font-medium transition-colors sm:h-9",
                filter === option
                  ? "border-primary bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {option === "all" ? t("filterAll") : tStatus(option)}
            </button>
          ))}
        </div>
      </div>
      {rows === undefined ? (
        <LoadingSkeleton count={3} />
      ) : rows.length === 0 ? (
        <EmptyState icon={ClipboardListIcon} title={t("emptyLoans")} />
      ) : (
        <DataTable columns={columns} rows={rows} getRowKey={(loan) => loan._id} />
      )}
    </PageTransition>
  );
}
