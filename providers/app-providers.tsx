import type { ReactNode } from "react";
import { ClerkProvider } from "@clerk/nextjs";

/**
 * Global providers shared by every page.
 * Clerk reads NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY from the environment.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return <ClerkProvider>{children}</ClerkProvider>;
}
