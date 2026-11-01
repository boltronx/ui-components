// @vitest-environment node
// Bundles an app that imports a single component from the built package and checks that no
// unrelated component comes along. A top-level side effect (e.g. `Menu.Target = MenuTarget`, or
// a call without /* @__PURE__ */) would make bundlers keep a component in every app. esbuild is
// stricter about side effects than Rollup/Rolldown, so passing here passes there too.
import { build } from "esbuild";
import { describe, expect, it } from "vitest";

import { dist, hasCurrentBuild } from "./dist";

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
      resolveDir: dist
    },
    bundle: true,
    write: false,
    minify: true,
    format: "esm",
    logLevel: "silent",
    external: ["react", "react/*", "react-dom", "react-dom/*"]
  });
  return result.outputFiles[0]!.text;
}

// Runs against dist, so it needs a current build first (CI builds before testing).
describe.skipIf(!hasCurrentBuild("tree shaking"))("tree shaking", () => {
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
