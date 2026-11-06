import type { ReactNode } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { CalendarCheckIcon, HandshakeIcon, ShieldCheckIcon } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { ClientOnly } from "@/components/shared/client-only";
import { Reveal } from "@/components/shared/motion";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/navigation";
import { routes } from "@/lib/routes";

// Royalty-free photo (Unsplash License), credited in public/seed/CREDITS.md.
const HERO_IMAGE =
  "https://images.unsplash.com/photo-1426927308491-6380b6a9936f?auto=format&fit=crop&w=1400&q=80";

/**
 * Two-panel sign-in / sign-up page: the Clerk form on the left, a photo with
 * the product promise on the right. Below lg the photo is hidden so the form
 * has the full screen.
 */
export function AuthSplitLayout({ children }: { children: ReactNode }) {
  const t = useTranslations("auth");

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="flex flex-col px-4 py-6 sm:px-8">
        <div className="flex items-center justify-between">
          <Link href={routes.home} className="rounded-lg">
            <Logo />
          </Link>
          <LanguageSwitcher />
        </div>
        <div className="flex flex-1 items-center justify-center py-10">
          <ClientOnly fallback={<Skeleton className="h-[26rem] w-[25rem] max-w-full rounded-xl" />}>
            <Reveal>{children}</Reveal>
          </ClientOnly>
        </div>
      </div>

      <div className="relative hidden overflow-hidden bg-muted lg:block">
        <Image
          src={HERO_IMAGE}
          alt={t("heroAlt")}
          fill
          priority
          sizes="50vw"
          className="object-cover"
        />
        {/* Flat dark overlay (no gradient) keeps the text readable on any photo. */}
        <div className="absolute inset-0 bg-black/55" aria-hidden="true" />
        <div className="absolute inset-x-0 bottom-0 space-y-6 p-12 text-white">
          <Reveal>
            <p className="max-w-md text-3xl font-semibold leading-tight tracking-tight">{t("heroTitle")}</p>
          </Reveal>
          <ul className="space-y-3 text-sm text-white/85">
            {[
              { icon: HandshakeIcon, text: t("heroPoint1") },
              { icon: CalendarCheckIcon, text: t("heroPoint2") },
              { icon: ShieldCheckIcon, text: t("heroPoint3") },
            ].map(({ icon: Icon, text }, index) => (
              <Reveal key={text} delay={0.1 + index * 0.08}>
                <li className="flex items-center gap-3">
                  <span className="grid size-8 place-items-center rounded-lg bg-white/15">
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  {text}
                </li>
              </Reveal>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
