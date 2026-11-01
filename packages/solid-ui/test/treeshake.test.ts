// @vitest-environment node
// Bundles an app that imports a single component from the built package and checks that no
// unrelated component comes along. A top-level side effect (e.g. `Menu.Target = MenuTarget`, or
// a call without /* @__PURE__ */) would make bundlers keep a component in every app. esbuild is
// stricter about side effects than Rollup/Rolldown, so passing here passes there too.
import { existsSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { build } from "esbuild";
import { describe, expect, it } from "vitest";

const entry = fileURLToPath(new URL("../dist/index.js", import.meta.url));

/** A class each component renders, so its presence in a bundle shows the component is there. */
const markers: Record<string, string> = {
  Autocomplete: "bx-Autocomplete",
  DatePicker: "bx-DatePicker",
  Menu: "bx-Menu-item",
  Modal: "bx-Modal",
  Select: "bx-Select-",
  Table: "bx-Table",
  message: "bx-Message"
};

async function bundle(name: string): Promise<string> {
  const result = await build({
    stdin: {
      contents: `import { ${name} } from "./index.js"; console.log(${name});`,
      resolveDir: dirname(entry)
    },
    bundle: true,
    write: false,
    minify: true,
    format: "esm",
    logLevel: "silent",
    external: ["solid-js", "solid-js/*"]
  });
  return result.outputFiles[0]!.text;
}

/** The newest modification time of any built source file under `dir` (not tests), in ms. */
function newestModified(dir: string): number {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter(item => item.isFile() && !/\.test\.tsx?$/.test(item.name))
    .reduce(
      (newest, item) => Math.max(newest, statSync(join(item.parentPath, item.name)).mtimeMs),
      0
    );
}

const source = fileURLToPath(new URL("../src", import.meta.url));
const built = existsSync(entry);
// A build older than the source tests old code: false failures, or worse, false passes.
const stale = built && statSync(entry).mtimeMs < newestModified(source);
if (stale) {
  const message =
    "tree shaking: dist is older than src; run `pnpm build` to test the current code.";
  // CI builds right before testing, so a stale build there means something is wrong.
  if (process.env.CI) throw new Error(message);
  console.warn(message);
}

// Runs against dist, so it needs a current build first (CI builds before testing).
describe.skipIf(!built || stale)("tree shaking", () => {
  it.each(["Button", "Input", "Stack", "Text", "useColorScheme", ...Object.keys(markers)])(
    "importing %s bundles no unrelated component",
    async name => {
      const code = await bundle(name);
      const unrelated = Object.entries(markers)
        .filter(([component, marker]) => component !== name && code.includes(marker))
        .map(([component]) => component);
      expect(unrelated).toEqual([]);
    }
  );

  it("keeps a single small component small", async () => {
    expect((await bundle("Button")).length).toBeLessThan(6000);
  });
});
