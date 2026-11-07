"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { RotateCwIcon } from "lucide-react";
import { ErrorState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";

// Last-resort boundary for unexpected rendering errors (business errors are
// handled where they happen and shown as toasts).
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("pages");
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <ErrorState
        title={t("errorTitle")}
        description={t("errorDescription")}
        action={
          <Button onClick={reset} className="h-11 gap-2 sm:h-10">
            <RotateCwIcon aria-hidden="true" />
            {t("retry")}
          </Button>
        }
      />
    </main>
  );
}
