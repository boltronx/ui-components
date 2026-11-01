import solid from "vite-plugin-solid";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        // Hot reloading only matters in a dev server, and breaks module loading under vitest.
        // Hydratable, like the browser build of an SSR app, so test/hydration.test.tsx can take
        // over server-rendered HTML; plain render() works the same.
        plugins: [solid({ hot: false, solid: { hydratable: true } })],
        test: {
          name: "dom",
          environment: "jsdom",
          // Reuses one jsdom per worker while keeping each test file isolated; about twice as fast.
          pool: "vmThreads",
          setupFiles: ["./test/setup.ts"],
          // Renders the hydration test's HTML on the server, through Vite's SSR pipeline.
          globalSetup: ["./test/ssr-setup.ts"],
          include: ["src/**/*.test.{ts,tsx}", "test/**/*.test.{ts,tsx}"],
          exclude: ["test/ssr.test.tsx"]
        }
      },
      {
        // Compiled with Solid's SSR compiler and run in Node, as a server renders a page.
        plugins: [solid({ hot: false, ssr: true })],
        test: {
          name: "ssr",
          environment: "node",
          include: ["test/ssr.test.tsx"]
        }
      }
    ],
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/icons/**", "src/**/*.test.{ts,tsx}", "src/index.tsx"],
      // json-summary feeds scripts/coverage-badge.mjs.
      reporter: ["text-summary", "lcov", "json-summary"],
      // A floor just under the current numbers, so coverage can only go up.
      thresholds: { lines: 84, statements: 80, functions: 86, branches: 67 }
    }
  }
});
