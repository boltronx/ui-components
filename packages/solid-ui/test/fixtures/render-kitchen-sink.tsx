// The server half of the hydration test: loaded by test/ssr-setup.ts through Vite's SSR pipeline.
import { generateHydrationScript, renderToString } from "solid-js/web";

import { KitchenSink } from "./kitchen-sink";

export function renderKitchenSink() {
  return {
    html: renderToString(() => <KitchenSink />),
    // The bootstrap a page puts in <head>; hydrate() reads the state it creates.
    hydrationScript: /<script[^>]*>([\s\S]*?)<\/script[^>]*>/i.exec(generateHydrationScript())![1]!
  };
}
