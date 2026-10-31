import { type ColorSchemeOptions, colorSchemeScript } from "./color-scheme/script";

export type { ColorSchemeOptions } from "./color-scheme/script";

/**
 * Vite plugin that inlines `colorSchemeScript` at the top of <head> in index.html.
 *
 *   import { colorScheme } from "@boltronx/solid-ui/vite";
 *   export default defineConfig({ plugins: [solid(), colorScheme()] });
 */
export function colorScheme(options: ColorSchemeOptions = {}) {
  return {
    name: "boltronx-solid-ui:color-scheme",
    transformIndexHtml() {
      return [
        { tag: "script", children: colorSchemeScript(options), injectTo: "head-prepend" as const }
      ];
    }
  };
}
