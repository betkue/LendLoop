"use client";

import { useTranslations } from "next-intl";
import { api } from "@/convex/_generated/api";
import { useSafeMutation } from "@/hooks/use-safe-mutation";

/** Every loan mutation, each with its own pending flag and success toast. */
export function useLoanActions() {
  const t = useTranslations("loans.toasts");
  return {
    request: useSafeMutation(api.loans.request, { successMessage: t("requested") }),
    cancel: useSafeMutation(api.loans.cancel, { successMessage: t("cancelled") }),
    approve: useSafeMutation(api.loans.approve, { successMessage: t("approved") }),
    decline: useSafeMutation(api.loans.decline, { successMessage: t("declined") }),
    markReturned: useSafeMutation(api.loans.markReturned, { successMessage: t("returned") }),
  };
}
