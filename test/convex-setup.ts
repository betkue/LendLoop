/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import schema from "../convex/schema";

// Every Convex module, so convex-test can run real queries and mutations.
export const modules = import.meta.glob("../convex/**/!(*.*.*)*.*s");

export function setupTest() {
  return convexTest(schema, modules);
}
