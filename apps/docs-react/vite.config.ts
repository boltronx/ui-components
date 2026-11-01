import { colorScheme } from "@boltronx/react-ui/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  // GitHub Pages serves the site from /<repo>/; the Pages workflow passes it in.
  base: process.env.DOCS_BASE ?? "/",
  plugins: [react(), colorScheme()]
});
