import type { ReactNode } from "react";
import { Footer } from "./footer";
import { Header } from "./header";

/** Page frame for visitors: store header with a sign-in action, content, footer. */
export function PublicShell({ children, actions }: { children: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <Header actions={actions} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-10">{children}</main>
      <Footer />
    </div>
  );
}
