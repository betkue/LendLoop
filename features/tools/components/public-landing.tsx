"use client";

import Image from "next/image";
import { useConvexAuth, usePreloadedQuery, type Preloaded } from "convex/react";
import { useTranslations } from "next-intl";
import { ArrowRightIcon, CalendarRangeIcon, PackagePlusIcon, RefreshCwIcon, WrenchIcon } from "lucide-react";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { Reveal, Stagger, StaggerItem } from "@/components/shared/motion";
import { EmptyState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import type { api } from "@/convex/_generated/api";
import { Link } from "@/i18n/navigation";
import { routes } from "@/lib/routes";
import type { PublicTool } from "../types";
import { CategoryBadge } from "./tool-badges";
import { ToolImage } from "./tool-image";

// Royalty-free photo (Unsplash License), credited in public/seed/CREDITS.md.
const HERO_IMAGE =
  "https://images.unsplash.com/photo-1663540275466-f171aa6d9f3e?auto=format&fit=crop&w=1600&q=80";

function AuthCta({ className }: { className?: string }) {
  const t = useTranslations("tools.landing");
  const { isAuthenticated } = useConvexAuth();
  return (
    <Button
      nativeButton={false}
      render={<Link href={isAuthenticated ? routes.tools : routes.signIn} />}
      className={className}
    >
      {isAuthenticated ? t("openApp") : t("signIn")}
      <ArrowRightIcon aria-hidden="true" />
    </Button>
  );
}

function PublicToolCard({ tool }: { tool: PublicTool }) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <ToolImage src={tool.imageUrl} alt={tool.name} category={tool.category} />
      <div className="space-y-2 p-4">
        <h3 className="line-clamp-1 font-medium">{tool.name}</h3>
        <CategoryBadge category={tool.category} />
      </div>
    </div>
  );
}

/**
 * Public home page: promise, call to action, how it works and the live list
 * of available tools (name, category and photo only).
 */
export function PublicLanding({ preloadedTools }: { preloadedTools: Preloaded<typeof api.tools.listPublic> }) {
  const t = useTranslations("tools.landing");
  const tools = usePreloadedQuery(preloadedTools);

  const steps = [
    { icon: PackagePlusIcon, title: t("step1Title"), text: t("step1Text") },
    { icon: CalendarRangeIcon, title: t("step2Title"), text: t("step2Text") },
    { icon: RefreshCwIcon, title: t("step3Title"), text: t("step3Text") },
  ];

  return (
    <div className="flex min-h-dvh flex-col">
      <Header showNav={false} actions={<AuthCta className="hidden h-9 gap-2 sm:inline-flex" />} />

      <section className="relative overflow-hidden border-b">
        <Image src={HERO_IMAGE} alt={t("heroAlt")} fill priority sizes="100vw" className="object-cover" />
        <div className="absolute inset-0 bg-background/85" aria-hidden="true" />
        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <Reveal className="max-w-2xl space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-sm text-muted-foreground">
              <WrenchIcon className="size-4 text-primary" aria-hidden="true" />
              LendLoop
            </span>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{t("title")}</h1>
            <p className="text-lg text-muted-foreground">{t("subtitle")}</p>
            <AuthCta className="h-12 gap-2 px-6 text-base" />
          </Reveal>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
        <Reveal>
          <h2 className="text-2xl font-semibold tracking-tight">{t("howTitle")}</h2>
        </Reveal>
        <Stagger className="mt-8 grid gap-4 md:grid-cols-3">
          {steps.map(({ icon: Icon, title, text }) => (
            <StaggerItem key={title} className="rounded-xl border bg-card p-6">
              <span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <h3 className="mt-4 font-medium">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{text}</p>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      <section className="border-t bg-muted/40">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
          <Reveal className="space-y-1">
            <h2 className="text-2xl font-semibold tracking-tight">{t("availableTitle")}</h2>
            <p className="text-muted-foreground">{t("availableSubtitle")}</p>
          </Reveal>
          {tools.length === 0 ? (
            <EmptyState
              icon={WrenchIcon}
              title={t("emptyTitle")}
              description={t("emptyDescription")}
              className="mt-8 bg-background"
            />
          ) : (
            <Stagger className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {tools.map((tool) => (
                <StaggerItem key={tool._id}>
                  <PublicToolCard tool={tool} />
                </StaggerItem>
              ))}
            </Stagger>
          )}
        </div>
      </section>
      <Footer />
    </div>
  );
}
