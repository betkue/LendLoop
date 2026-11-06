import type { ReactNode } from "react";
import { ClerkProvider } from "@clerk/nextjs";
import { ConvexClientProvider } from "./convex-client-provider";

/**
 * Global providers shared by every page.
 * Order matters: Convex needs the Clerk session, so it sits inside ClerkProvider.
 * Clerk reads NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY from the environment.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider>
      <ConvexClientProvider>{children}</ConvexClientProvider>
    </ClerkProvider>
  );
}
