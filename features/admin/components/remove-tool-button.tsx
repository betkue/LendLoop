"use client";

import { useTranslations } from "next-intl";
import { ShieldAlertIcon, Trash2Icon } from "lucide-react";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import type { Id } from "@/convex/_generated/dataModel";
import { useRouter } from "@/i18n/navigation";
import { routes } from "@/lib/routes";
import { useAdminActions, useIsAdmin } from "../hooks/use-admin";

/** Moderation panel on tool pages, rendered for admins only. */
export function RemoveToolButton({ toolId }: { toolId: Id<"tools"> }) {
  const t = useTranslations("admin");
  const tCommon = useTranslations("common");
  const isAdmin = useIsAdmin();
  const router = useRouter();
  const { removeTool } = useAdminActions();
  if (!isAdmin) return null;

  return (
    <div className="space-y-3 rounded-xl border border-dashed p-5">
      <p className="flex items-center gap-2 text-sm font-medium">
        <ShieldAlertIcon className="size-4 text-muted-foreground" aria-hidden="true" />
        {t("moderation")}
      </p>
      <ConfirmDialog
        trigger={
          <Button variant="outline" className="h-11 w-full gap-1 text-destructive hover:text-destructive sm:h-9">
            <Trash2Icon aria-hidden="true" />
            {t("removeListing")}
          </Button>
        }
        title={t("removeTitle")}
        description={t("removeDescription")}
        confirmLabel={tCommon("delete")}
        destructive
        onConfirm={async () => {
          const outcome = await removeTool.mutate({ toolId });
          if (outcome.ok) router.push(routes.tools);
        }}
      />
    </div>
  );
}
