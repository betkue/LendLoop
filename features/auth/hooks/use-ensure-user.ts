"use client";

import { useEffect, useRef } from "react";
import { useConvexAuth, useMutation } from "convex/react";
import { useLocale } from "next-intl";
import { api } from "@/convex/_generated/api";

/**
 * Creates (or refreshes) the user's Convex row once per session, as soon as
 * Convex has accepted the Clerk token. New users start with the current UI
 * language for their notifications.
 */
export function useEnsureUser() {
  const { isAuthenticated } = useConvexAuth();
  const ensureUser = useMutation(api.users.ensureUser);
  const locale = useLocale();
  const done = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || done.current) return;
    done.current = true;
    ensureUser({ locale }).catch(() => {
      // Allow a retry on the next render if the call failed (e.g. offline).
      done.current = false;
    });
  }, [ensureUser, isAuthenticated, locale]);
}
