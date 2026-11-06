"use client";

import type { ReactNode } from "react";
import { MotionConfig } from "motion/react";

/**
 * Applies the user's operating-system "reduce motion" setting to every Motion
 * animation: movement is removed, opacity fades stay.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
