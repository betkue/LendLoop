"use client";

import { useTranslations } from "next-intl";
import { SendIcon, XIcon } from "lucide-react";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PageTransition, Stagger, StaggerItem } from "@/components/shared/motion";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, LoadingSkeleton } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { routes } from "@/lib/routes";
import { useLoanActions } from "../hooks/use-loan-actions";
import { useMyRequests } from "../hooks/use-loans";
import { AutomationActivity } from "./automation-activity";
import { LoanCard } from "./loan-card";

/** "My requests": the user's loans, with cancel while pending and reminder history. */
export function MyRequests() {
  const t = useTranslations("loans.myRequests");
  const loans = useMyRequests();
  const { cancel } = useLoanActions();

  return (
    <PageTransition className="space-y-6">
      <PageHeader title={t("title")} description={t("subtitle")} />
      {loans === undefined ? (
        <LoadingSkeleton count={3} className="lg:grid-cols-1 sm:grid-cols-1" />
      ) : loans.length === 0 ? (
        <EmptyState
          icon={SendIcon}
          title={t("emptyTitle")}
          description={t("emptyDescription")}
          action={
            <Button nativeButton={false} render={<Link href={routes.tools} />} className="h-11 sm:h-9">
              {t("browse")}
            </Button>
          }
        />
      ) : (
        <Stagger className="space-y-3">
          {loans.map((loan) => (
            <StaggerItem key={loan._id}>
              <LoanCard
                loan={loan}
                subtitle={t("owner", { name: loan.otherPartyName })}
                actions={
                  loan.status === "pending" ? (
                    <ConfirmDialog
                      trigger={
                        <Button variant="outline" className="h-11 gap-1 sm:h-9">
                          <XIcon aria-hidden="true" />
                          {t("cancel")}
                        </Button>
                      }
                      title={t("cancelTitle")}
                      description={t("cancelDescription")}
                      confirmLabel={t("cancel")}
                      destructive
                      onConfirm={() => cancel.mutate({ loanId: loan._id })}
                    />
                  ) : undefined
                }
              >
                {(loan.status === "approved" || loan.status === "returned") && (
                  <AutomationActivity loanId={loan._id} />
                )}
              </LoanCard>
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </PageTransition>
  );
}
