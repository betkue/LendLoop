// Public API of the auth module: pages import from "@/features/auth" only.
export { AuthSplitLayout } from "./components/auth-split-layout";
export { MemberShell } from "./components/member-shell";
export { UserMenu } from "./components/user-menu";
export { useCurrentUser } from "./hooks/use-current-user";
export type { CurrentUser } from "./types";
