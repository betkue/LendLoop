/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import schema from "../convex/schema";

// Every Convex module, so convex-test can run real queries and mutations.
// Test files and type declarations (names with two dots) are excluded.
export const modules = import.meta.glob(["../convex/**/*.*s", "!../convex/**/*.*.*s"]);

export function setupTest() {
  return convexTest(schema, modules);
}
