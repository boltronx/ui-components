import { colorScheme } from "@boltronx/solid-ui/vite";
import { defineConfig } from "vite";
import solid from "vite-plugin-solid";

export default defineConfig({
  // GitHub Pages serves the site from /<repo>/; the Pages workflow passes it in.
  base: process.env.DOCS_BASE ?? "/",
  plugins: [solid(), colorScheme()]
});
