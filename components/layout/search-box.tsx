"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { SearchIcon } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";

/** Catalog search: submits to /search?q=… and keeps the current query in the field. */
export function SearchBox({ className, onSubmitted }: { className?: string; onSubmitted?: () => void }) {
  const t = useTranslations("header");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get("q") ?? "");

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const query = value.trim();
    router.push(query ? routes.search(query) : routes.tools);
    onSubmitted?.();
  }

  return (
    <form role="search" onSubmit={submit} className={cn("relative", className)}>
      <SearchIcon
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <input
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={t("searchPlaceholder")}
        aria-label={t("search")}
        maxLength={80}
        className="h-11 w-full rounded-full border bg-muted/50 pr-4 pl-9 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:bg-background focus:ring-3 focus:ring-ring/30 sm:h-10"
      />
    </form>
  );
}
