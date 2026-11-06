"use client";

import type { ReactNode } from "react";
import { useAuth } from "@clerk/nextjs";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!convexUrl) {
  throw new Error("Missing NEXT_PUBLIC_CONVEX_URL. Run `npx convex dev` to create it.");
}

// One client for the whole app; it keeps a single WebSocket open to Convex.
const convex = new ConvexReactClient(convexUrl);

/**
 * Connects Convex to the signed-in Clerk session: every query and mutation
 * is sent with the Clerk JWT so Convex functions can identify the user.
 * Must be rendered inside ClerkProvider.
 */
export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      {children}
    </ConvexProviderWithClerk>
  );
}
