import { defineConfig, type Options } from "tsup";
import * as preset from "tsup-preset-solid";

const presetOptions: preset.PresetOptions = {
  // server_entry adds dist/server.js, compiled for SSR, for the node, deno and worker conditions.
  entries: [{ entry: "src/index.tsx", server_entry: true }],
  drop_console: false
};

// tsup's declaration build sets `baseUrl`, which TypeScript 6 deprecates; the option is harmless here.
const dts = { compilerOptions: { ignoreDeprecations: "6.0" } };

export default defineConfig(config => {
  const parsed = preset.parsePresetOptions(presetOptions, !!config.watch);

  return [
    // `clean` is off because the configs build in parallel; the build script clears dist first.
    ...preset
      .generateTsupOptions(parsed)
      .map(options => ({ ...options, clean: false, ...(options.dts ? { dts } : {}) })),
    // The Vite plugin runs in Node inside the user's vite.config, so it is built without Solid.
    {
      entry: { vite: "src/vite.ts" },
      outDir: "dist",
      format: ["esm"],
      platform: "node",
      target: "node20",
      dts,
      clean: false
    }
  ] as Options[];
});
