"use client";

import { useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";

/**
 * Reads and writes one URL search parameter (e.g. ?category=garden), so a
 * filter survives reloads, can be shared and works with the back button.
 * Passing null removes the parameter.
 */
export function useSearchParam(name: string): [string | null, (value: string | null) => void] {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const value = searchParams.get(name);

  const setValue = useCallback(
    (next: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next === null || next === "") params.delete(name);
      else params.set(name, next);
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [name, pathname, router, searchParams],
  );

  return [value, setValue];
}
