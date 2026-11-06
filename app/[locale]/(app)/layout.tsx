import { MemberShell } from "@/features/auth";

// Signed-in area. proxy.ts redirects signed-out visitors to the sign-in page.
export default function MemberLayout({ children }: LayoutProps<"/[locale]">) {
  return <MemberShell>{children}</MemberShell>;
}
