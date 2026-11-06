"use client";

import { useCallback } from "react";
import { useConvexAuth, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Locale } from "@/i18n/routing";

/** Returns a callback that stores a new UI language as the user's notification language. */
export function useLocaleSync() {
  const { isAuthenticated } = useConvexAuth();
  const setLocale = useMutation(api.users.setLocale);

  return useCallback(
    (locale: Locale) => {
      if (isAuthenticated) void setLocale({ locale }).catch(() => undefined);
    },
    [isAuthenticated, setLocale],
  );
}
