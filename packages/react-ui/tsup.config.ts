import { defineConfig } from "tsup";

// Only the type declarations: scripts/build-js.mjs builds the JavaScript, one file per module.
// Bundled into one .d.ts per entry, so type resolution needs no file extensions.
export default defineConfig({
  entry: { index: "src/index.ts", vite: "src/vite.ts" },
  outDir: "dist",
  format: ["esm"],
  // tsup's declaration build sets `baseUrl`, which TypeScript 6 deprecates; the option is harmless here.
  dts: { only: true, compilerOptions: { ignoreDeprecations: "6.0" } },
  external: ["react", "react-dom"],
  clean: false
});
