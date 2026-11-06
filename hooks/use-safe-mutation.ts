"use client";

import { useCallback, useState } from "react";
import { useMutation } from "convex/react";
import type { FunctionArgs, FunctionReference, FunctionReturnType } from "convex/server";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { getErrorCode } from "@/lib/errors";

type MutationRef = FunctionReference<"mutation">;

export type MutationOutcome<T> = { ok: true; value: T } | { ok: false };

/**
 * Wraps a Convex mutation with the app's standard feedback:
 * an optional success toast, a translated error toast (from the ConvexError
 * code) and a pending flag for disabling buttons.
 * Resolves to { ok: true, value } on success and { ok: false } on failure.
 */
export function useSafeMutation<M extends MutationRef>(
  mutation: M,
  options: { successMessage?: string } = {},
) {
  const run = useMutation(mutation);
  const tErrors = useTranslations("errors");
  const [isPending, setIsPending] = useState(false);
  const { successMessage } = options;

  const mutate = useCallback(
    async (args: FunctionArgs<M>): Promise<MutationOutcome<FunctionReturnType<M>>> => {
      setIsPending(true);
      try {
        const result = await run(args);
        if (successMessage) toast.success(successMessage);
        return { ok: true, value: result };
      } catch (error) {
        toast.error(tErrors(getErrorCode(error)));
        return { ok: false };
      } finally {
        setIsPending(false);
      }
    },
    [run, successMessage, tErrors],
  );

  return { mutate, isPending };
}
