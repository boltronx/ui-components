// @vitest-environment node
// Guards the styling contract: components style only their own `bx-` classes, use tokens instead
// of literal colors, and never reference a token that doesn't exist.
import { readFileSync } from "node:fs";

import { transform } from "lightningcss";
import { describe, expect, it } from "vitest";

import { buildCss, componentFiles } from "../scripts/build-css.mjs";

const files = componentFiles();
const tokens = readFileSync(new URL("../src/styles/tokens.css", import.meta.url), "utf8");
const definedTokens = new Set([...tokens.matchAll(/(--bx-[\w-]+)\s*:/g)].map(match => match[1]));

type SelectorComponent = { type: string; name?: string; kind?: string; selectors?: unknown };

/** Every selector of every style rule, with nesting flattened so `&` is resolved. */
function selectorsOf(css: string, filename: string): SelectorComponent[][] {
  // Old targets make lightningcss un-nest rules, so each selector in the output is complete.
  const flat = transform({ filename, code: Buffer.from(css), targets: { chrome: 100 << 16 } }).code;
  const selectors: SelectorComponent[][] = [];
  transform({
    filename,
    code: flat,
    visitor: {
      Rule: {
        style(rule) {
          selectors.push(...(rule.value.selectors as SelectorComponent[][]));
        }
      }
    }
  });
  return selectors;
}

// Component-level variables (e.g. --bx-button-color), which other components may read too.
const componentVariables = new Set(
  files.flatMap(file =>
    [...readFileSync(file, "utf8").matchAll(/(--bx-[\w-]+)\s*:/g)].map(match => match[1])
  )
);

describe("component CSS", () => {
  it("finds the component stylesheets", () => {
    expect(files.length).toBeGreaterThan(20);
  });

  /** True when the selector names a bx- class, directly or inside :is()/:where(). */
  const ownsClass = (selector: SelectorComponent[]): boolean =>
    selector.some(
      c =>
        (c.type === "class" && c.name?.startsWith("bx-")) ||
        (Array.isArray(c.selectors) && (c.selectors as SelectorComponent[][]).every(ownsClass))
    );

  it.each(files)("%s only targets bx- classes", file => {
    for (const selector of selectorsOf(readFileSync(file, "utf8"), file)) {
      expect(ownsClass(selector), JSON.stringify(selector)).toBe(true);
    }
  });

  it.each(files)("%s uses tokens instead of hex colors", file => {
    const css = readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(css.match(/#[0-9a-f]{3,8}\b/gi)).toBeNull();
  });

  it.each(files)("%s references only defined tokens", file => {
    const css = readFileSync(file, "utf8");
    // Set from component code as inline styles
    const inline = new Set([
      "--bx-grid-min",
      "--bx-modal-offset",
      "--bx-flex-direction",
      ...["sm", "md", "lg", "xl"].map(breakpoint => `--bx-flex-direction-${breakpoint}`)
    ]);
    for (const [, name] of css.matchAll(/var\((--bx-[\w-]+)/g)) {
      const known = definedTokens.has(name) || componentVariables.has(name) || inline.has(name!);
      expect(known, `${name} is not defined`).toBe(true);
    }
  });
});

describe("built stylesheets", () => {
  it("wrap everything in the bx layer", () => {
    const css = buildCss({ includeGlobal: true });
    expect(css.startsWith("@layer bx{")).toBe(true);
    expect(css.endsWith("}")).toBe(true);
  });

  it("leave page styles out of components.css", () => {
    const withGlobal = buildCss({ includeGlobal: true });
    const componentsOnly = buildCss({ includeGlobal: false });
    const bodyRule = /[{}]body\{/;
    expect(withGlobal).toMatch(bodyRule);
    expect(componentsOnly).not.toMatch(bodyRule);
    expect(componentsOnly).toContain("--bx-primary:");
  });
});

describe("layers", () => {
  const layer = (name: string) =>
    Number(new RegExp(`--bx-z-${name}:\\s*(\\d+)`).exec(tokens)?.[1] ?? Number.NaN);

  it("stack modals, then dropdowns, messages and tooltips on top", () => {
    const order = ["modal", "popover", "toast", "tooltip"].map(layer);
    expect(order.every(Number.isFinite)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it("use a --bx-z token, or a small number inside the component's own stacking context", () => {
    const offenders = files.flatMap(file =>
      [...readFileSync(file, "utf8").matchAll(/z-index:\s*([^;]+);/g)]
        .map(match => match[1]!.trim())
        .filter(value => !/^var\(--bx-z-[\w-]+\)$/.test(value) && !(Number(value) <= 10))
        .map(value => `${file}: z-index ${value}`)
    );
    expect(offenders).toEqual([]);
  });
});

describe("forced colors", () => {
  it("draws focus with an outline, which forced-colors modes keep, where box-shadow is dropped", () => {
    const css = buildCss({ includeGlobal: false });
    const block = /@media\s*\(forced-colors:\s*active\)\s*\{(.*?\}\s*)\}/s.exec(css)?.[1] ?? "";
    expect(block).toMatch(/:focus-visible/);
    expect(block).toMatch(/\.bx-Switch-input:focus-visible\s*\+\s*\.bx-Switch-track/);
    expect(block).toMatch(/\.bx-Combobox-option\[data-active\]/);
    expect(block).toMatch(/\.bx-DatePicker-cell\[data-active\]/);
    expect(block).toMatch(/outline:\s*2px solid highlight\s*!important/i);
  });
});
