import { useTranslations } from "next-intl";
import { MapPinOffIcon } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { ErrorState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { routes } from "@/lib/routes";

export default function NotFound() {
  const t = useTranslations("pages");
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 p-6">
      <Logo />
      <ErrorState
        icon={MapPinOffIcon}
        title={t("notFoundTitle")}
        description={t("notFoundDescription")}
        action={
          <Button nativeButton={false} render={<Link href={routes.home} />} className="h-11 sm:h-10">
            {t("goHome")}
          </Button>
        }
      />
    </main>
  );
}
