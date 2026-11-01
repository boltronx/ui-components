// @vitest-environment node
// React Server Components: a bundler such as Next.js runs a module on the server unless the file
// starts with "use client". Hooks, context and react-dom throw there, so every built module that
// uses them must be a client module; the presentational components must not be, so they render
// on the server with no JavaScript sent for them. apps/next-fixture checks the same in a real build.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { describe, expect, it } from "vitest";

import { dist, hasCurrentBuild } from "./dist";

function builtModules(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return builtModules(path);
    return name.endsWith(".js") ? [path] : [];
  });
}

const CLIENT_ONLY =
  /\b(useState|useEffect|useLayoutEffect|useRef|useContext|useId|useMemo|useCallback|useSyncExternalStore|createContext)\b|from "react-dom/;

/** Components that render on the server as they are: no state, effects or context. */
const SERVER_COMPONENTS = [
  "components/Anchor/Anchor.js",
  "components/Avatar/Avatar.js",
  "components/Button/Button.js",
  "components/Card/Card.js",
  "components/Code/Code.js",
  "components/Flex/Flex.js",
  "components/Group/Group.js",
  "components/Indicator/Indicator.js",
  "components/Loader/Loader.js",
  "components/Progress/Progress.js",
  "components/SimpleGrid/SimpleGrid.js",
  "components/Skeleton/Skeleton.js",
  "components/Stack/Stack.js",
  "components/Text/Text.js",
  "components/Title/Title.js",
  "color-scheme/ColorSchemeScript.js",
  "color-scheme/script.js",
  "icons/index.js"
];

const isClient = (code: string) => /^["']use client["'];/.test(code.trimStart());

// Runs against dist, so it needs a current build first (CI builds before testing).
const currentBuild = hasCurrentBuild("server component boundaries");
describe.skipIf(!currentBuild)("server component boundaries", () => {
  const modules = (currentBuild ? builtModules(dist) : []).map(path => ({
    name: relative(dist, path).replaceAll("\\", "/"),
    code: readFileSync(path, "utf8")
  }));

  it("finds the built modules", () => {
    expect(modules.length).toBeGreaterThan(40);
  });

  it("marks every module that uses hooks, context or react-dom as a client module", () => {
    const missing = modules
      .filter(({ code }) => CLIENT_ONLY.test(code) && !isClient(code))
      .map(({ name }) => name);
    expect(missing).toEqual([]);
  });

  it.each(SERVER_COMPONENTS)("keeps %s a server component", name => {
    const module = modules.find(m => m.name === name);
    expect(module, `${name} was not built`).toBeDefined();
    expect(isClient(module!.code)).toBe(false);
    expect(CLIENT_ONLY.test(module!.code)).toBe(false);
  });

  it("puts the directive first, where bundlers look for it", () => {
    const misplaced = modules
      .filter(({ code }) => code.includes('"use client"') && !isClient(code))
      .map(({ name }) => name);
    expect(misplaced).toEqual([]);
  });

  it("keeps the barrel free of the directive, so it can re-export both kinds", () => {
    const barrel = modules.find(m => m.name === "index.js")!;
    expect(isClient(barrel.code)).toBe(false);
  });
});
