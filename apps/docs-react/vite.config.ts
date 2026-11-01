import { colorScheme } from "@boltronx/react-ui/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, normalizePath, type Plugin } from "vite";

/**
 * Reloads the page when the library's JS is rebuilt (`pnpm dev:react` watches it), instead of
 * hot-swapping it. Its modules keep state, such as the open modals and the ModalHost that renders
 * them; a swapped-in copy starts without that state, so it would open modals outside the app's
 * providers (the router). CSS still updates in place.
 */
function reloadOnLibraryBuild(): Plugin {
  return {
    name: "reload-on-library-build",
    hotUpdate({ file }) {
      const path = normalizePath(file);
      if (!path.includes("/packages/react-ui/dist/") || path.endsWith(".css")) return;
      this.environment.hot.send({ type: "full-reload" });
      return [];
    }
  };
}

export default defineConfig({
  // GitHub Pages serves the site from /<repo>/; the Pages workflow passes it in.
  base: process.env.DOCS_BASE ?? "/",
  plugins: [react(), colorScheme(), reloadOnLibraryBuild()]
});
