import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

/**
 * Locale-aware replacements for next/link and next/navigation.
 * Always import these instead of the Next.js versions so links keep the
 * current locale prefix (e.g. <Link href="/tools"> renders /fr/tools).
 */
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
