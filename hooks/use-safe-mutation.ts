"use client";

import { useCallback, useState } from "react";
import { useMutation } from "convex/react";
import type { FunctionArgs, FunctionReference, FunctionReturnType } from "convex/server";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { getErrorCode } from "@/lib/errors";

type MutationRef = FunctionReference<"mutation">;

/**
 * Wraps a Convex mutation with the app's standard feedback:
 * an optional success toast, a translated error toast (from the ConvexError
 * code) and a pending flag for disabling buttons.
 * Resolves to the mutation result, or undefined when it failed.
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
    async (args: FunctionArgs<M>): Promise<FunctionReturnType<M> | undefined> => {
      setIsPending(true);
      try {
        const result = await run(args);
        if (successMessage) toast.success(successMessage);
        return result;
      } catch (error) {
        toast.error(tErrors(getErrorCode(error)));
        return undefined;
      } finally {
        setIsPending(false);
      }
    },
    [run, successMessage, tErrors],
  );

  return { mutate, isPending };
}
