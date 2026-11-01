// Renders the kitchen sink on the server once, before the tests, the way an SSR app renders a
// page: a Vite server loads it with ssrLoadModule, so Solid compiles it for SSR and resolves the
// server build of solid-js. The hydration test (in jsdom) gets the HTML through inject().
import { fileURLToPath } from "node:url";

import { createServer } from "vite";
import solid from "vite-plugin-solid";
import type { TestProject } from "vitest/node";

declare module "vitest" {
  export interface ProvidedContext {
    kitchenSinkHtml: string;
    hydrationScript: string;
  }
}

export default async function setup(project: TestProject) {
  const server = await createServer({
    configFile: false,
    root: fileURLToPath(new URL("..", import.meta.url)),
    appType: "custom",
    logLevel: "silent",
    server: { middlewareMode: true, hmr: false, watch: null },
    plugins: [solid({ hot: false, ssr: true })]
  });
  try {
    const { renderKitchenSink } = (await server.ssrLoadModule(
      "/test/fixtures/render-kitchen-sink.tsx"
    )) as typeof import("./fixtures/render-kitchen-sink");
    const { html, hydrationScript } = renderKitchenSink();
    project.provide("kitchenSinkHtml", html);
    project.provide("hydrationScript", hydrationScript);
  } finally {
    await server.close();
  }
}
