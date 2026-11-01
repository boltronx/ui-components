import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    // Reuses one jsdom per worker while keeping each test file isolated; about twice as fast.
    pool: "vmThreads",
    setupFiles: ["./test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}", "test/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/icons/**", "src/**/*.test.{ts,tsx}", "src/index.ts"],
      // json-summary feeds scripts/coverage-badge.mjs.
      reporter: ["text-summary", "lcov", "json-summary"],
      // A floor just under the current numbers, so coverage can only go up.
      thresholds: { lines: 88, statements: 85, functions: 90, branches: 78 }
    }
  }
});
