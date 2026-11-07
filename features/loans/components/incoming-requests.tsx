"use client";

import { useTranslations } from "next-intl";
import { CheckIcon, InboxIcon, RotateCcwIcon, TriangleAlertIcon, XIcon } from "lucide-react";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PageTransition, Stagger, StaggerItem } from "@/components/shared/motion";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, LoadingSkeleton } from "@/components/shared/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLoanActions } from "../hooks/use-loan-actions";
import { useIncomingRequests } from "../hooks/use-loans";
import type { IncomingLoan } from "../types";
import { AutomationActivity } from "./automation-activity";
import { LoanCard } from "./loan-card";

/**
 * "Incoming requests" in three tabs: to review (approve / decline, with an
 * overlap warning), on loan (mark as returned) and history. Updates live.
 */
export function IncomingRequests() {
  const t = useTranslations("loans.incoming");
  const loans = useIncomingRequests();
  const actions = useLoanActions();

  if (loans === undefined) {
    return (
      <div className="space-y-6">
        <PageHeader title={t("title")} description={t("subtitle")} />
        <LoadingSkeleton count={3} className="sm:grid-cols-1 lg:grid-cols-1" />
      </div>
    );
  }

  const pending = loans.filter((loan) => loan.status === "pending");
  const active = loans.filter((loan) => loan.status === "approved");
  const history = loans.filter((loan) => !["pending", "approved"].includes(loan.status));

  const renderList = (items: IncomingLoan[], empty: string) =>
    items.length === 0 ? (
      <EmptyState icon={InboxIcon} title={empty} description={t("emptyDescription")} />
    ) : (
      <Stagger className="space-y-3">
        {items.map((loan) => (
          <StaggerItem key={loan._id}>
            <LoanCard
              loan={loan}
              subtitle={t("borrower", { name: loan.otherPartyName })}
              actions={<LoanActions loan={loan} actions={actions} />}
            >
              {loan.overlapsApproved && (
                <p className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
                  <TriangleAlertIcon className="size-4" aria-hidden="true" />
                  {t("overlapWarning")}
                </p>
              )}
              {loan.status === "approved" && <AutomationActivity loanId={loan._id} />}
            </LoanCard>
          </StaggerItem>
        ))}
      </Stagger>
    );

  const tab = (label: string, count: number) => (
    <span className="flex items-center gap-2">
      {label}
      {count > 0 && <Badge variant="secondary">{count}</Badge>}
    </span>
  );

  return (
    <PageTransition className="space-y-6">
      <PageHeader title={t("title")} description={t("subtitle")} />
      <Tabs defaultValue={pending.length > 0 || active.length === 0 ? "pending" : "active"}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="pending" className="h-10 flex-1 sm:flex-none">
            {tab(t("tabPending"), pending.length)}
          </TabsTrigger>
          <TabsTrigger value="active" className="h-10 flex-1 sm:flex-none">
            {tab(t("tabActive"), active.length)}
          </TabsTrigger>
          <TabsTrigger value="history" className="h-10 flex-1 sm:flex-none">
            {t("tabHistory")}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="pending" className="mt-4">
          {renderList(pending, t("emptyPending"))}
        </TabsContent>
        <TabsContent value="active" className="mt-4">
          {renderList(active, t("emptyActive"))}
        </TabsContent>
        <TabsContent value="history" className="mt-4">
          {renderList(history, t("emptyHistory"))}
        </TabsContent>
      </Tabs>
    </PageTransition>
  );
}

function LoanActions({ loan, actions }: { loan: IncomingLoan; actions: ReturnType<typeof useLoanActions> }) {
  const t = useTranslations("loans.incoming");

  if (loan.status === "pending") {
    return (
      <>
        <Button
          className="h-11 gap-1 sm:h-9"
          disabled={loan.overlapsApproved || actions.approve.isPending}
          onClick={() => actions.approve.mutate({ loanId: loan._id })}
        >
          <CheckIcon aria-hidden="true" />
          {t("approve")}
        </Button>
        <ConfirmDialog
          trigger={
            <Button variant="outline" className="h-11 gap-1 sm:h-9">
              <XIcon aria-hidden="true" />
              {t("decline")}
            </Button>
          }
          title={t("declineTitle")}
          description={t("declineDescription")}
          confirmLabel={t("decline")}
          destructive
          onConfirm={() => actions.decline.mutate({ loanId: loan._id })}
        />
      </>
    );
  }

  if (loan.status === "approved") {
    return (
      <ConfirmDialog
        trigger={
          <Button variant="outline" className="h-11 gap-1 sm:h-9">
            <RotateCcwIcon aria-hidden="true" />
            {t("markReturned")}
          </Button>
        }
        title={t("returnTitle")}
        description={t("returnDescription")}
        confirmLabel={t("markReturned")}
        onConfirm={() => actions.markReturned.mutate({ loanId: loan._id })}
      />
    );
  }

  return null;
}
