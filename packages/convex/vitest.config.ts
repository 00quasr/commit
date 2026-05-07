import { defineConfig } from "vitest/config";

// convex-test runs the Convex isolate inside an edge-runtime VM so its
// fetch / Web Crypto / Response globals match the production deployment.
export default defineConfig({
  test: {
    server: { deps: { inline: ["convex-test"] } },
    environment: "edge-runtime",
    include: ["tests/**/*.test.ts"],
  },
});
