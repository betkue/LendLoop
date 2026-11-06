import { defineConfig } from "vitest/config";

// Convex functions are tested with convex-test in the edge runtime, close to
// the real Convex environment.
export default defineConfig({
  test: {
    environment: "edge-runtime",
    include: ["convex/**/*.test.ts"],
    server: { deps: { inline: ["convex-test"] } },
  },
});
