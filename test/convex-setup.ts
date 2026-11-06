/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { api } from "../convex/_generated/api";
import schema from "../convex/schema";

// Every Convex module, so convex-test can run real queries and mutations.
// Test files and type declarations (names with two dots) are excluded.
export const modules = import.meta.glob(["../convex/**/*.*s", "!../convex/**/*.*.*s"]);

export function setupTest() {
  return convexTest(schema, modules);
}

type TestConvex = ReturnType<typeof setupTest>;

/** Signs a fake Clerk user in and creates their Convex row. */
export async function signIn(t: TestConvex, name: string) {
  const key = name.toLowerCase();
  const asUser = t.withIdentity({
    tokenIdentifier: `clerk|${key}`,
    subject: key,
    name,
    email: `${key}@example.com`,
  });
  const userId = await asUser.mutation(api.users.ensureUser, { locale: "en" });
  return { asUser, userId };
}

export const sampleTool = {
  name: "Cordless drill",
  category: "diy",
  condition: "good",
  description: "Comes with two batteries.",
} as const;
