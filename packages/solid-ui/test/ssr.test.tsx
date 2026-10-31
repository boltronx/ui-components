// @vitest-environment node
// Server rendering, as SolidStart and other SSR frameworks do it: in Node, with no window or
// document, compiled with Solid's SSR compiler. Importing the package and rendering every
// component must not touch browser APIs.
import { existsSync } from "node:fs";

import { renderToString } from "solid-js/web";

import { describe, expect, it, vi } from "vitest";

import { message, modal } from "../src";

import { KitchenSink } from "./fixtures/kitchen-sink";

describe("server rendering", () => {
  it("runs without a DOM", () => {
    expect(typeof window).toBe("undefined");
    expect(typeof document).toBe("undefined");
  });

  it("renders every component to HTML without errors or warnings", () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const warnings = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const html = renderToString(() => <KitchenSink />);
      expect(html).toContain("bx-Button");
      expect(html).toContain("bx-Select-control");
      expect(errors).not.toHaveBeenCalled();
      expect(warnings).not.toHaveBeenCalled();
    } finally {
      errors.mockRestore();
      warnings.mockRestore();
    }
  });

  it("renders form values into the HTML, so fields are filled before hydration", () => {
    const html = renderToString(() => <KitchenSink />);
    expect(html).toMatch(/<input[^>]*value="Ada"/);
    // Grouped for display, plain in the hidden input the form submits.
    expect(html).toContain('value="1,234.50"');
    expect(html).toMatch(
      /type="hidden"[^>]*name="amount"[^>]*value="1234.5"|name="amount"[^>]*type="hidden"[^>]*value="1234.5"/
    );
    expect(html).toMatch(/name="fruit"[^>]*value="apple"/);
    expect(html).toContain('value="Oct 5, 2026"');
    expect(html).toContain('role="switch"');
    expect(html).toMatch(/<textarea[^>]*>Hi<\/textarea>/);
    // A readonly attribute locks a field even as readonly="false", so it is left out.
    expect(html).not.toMatch(/\sreadonly="false"/i);
  });

  it("renders the default color scheme, since the saved one is only known in the browser", () => {
    expect(renderToString(() => <KitchenSink />)).toMatch(/Theme: (<!--[^>]*-->)?light/);
  });

  it("renders Flex's responsive direction, so the layout is right before JavaScript runs", () => {
    const html = renderToString(() => <KitchenSink />);
    const flex = /<section[^>]*class="bx-Flex[^>]*>/.exec(html)?.[0] ?? "";
    expect(flex).toContain('data-direction-md=""');
    expect(flex).toMatch(/--bx-flex-direction:\s*column/);
    expect(flex).toMatch(/--bx-flex-direction-md:\s*row/);
  });

  it("leaves dropdowns, tooltips and portals out of the server HTML", () => {
    expect(renderToString(() => <KitchenSink />)).not.toContain("bx-FloatingPanel");
  });

  it("imports the imperative APIs on the server without running them", () => {
    expect(typeof message.success).toBe("function");
    expect(typeof modal.open).toBe("function");
  });
});

// The published server build (dist/server.js, for the node condition) needs no compiler: an app
// can render it straight from node_modules.
describe.skipIf(!existsSync(new URL("../dist/server.js", import.meta.url)))(
  "the published server build",
  () => {
    it("renders components to HTML", async () => {
      // Typed as the source: dist/server.js is the same API, built for the server.
      const ui = (await import(
        new URL("../dist/server.js", import.meta.url).href
      )) as typeof import("../src");
      const html = renderToString(() =>
        ui.Stack({
          get children() {
            return [
              ui.Input({ label: "Name", defaultValue: "Ada" }),
              ui.Switch({ label: "Wi-Fi", defaultChecked: true }),
              ui.Button({ children: "Save" })
            ];
          }
        })
      );
      expect(html).toContain("bx-Stack");
      expect(html).toMatch(/<input[^>]*value="Ada"/);
      expect(html).toContain('role="switch"');
      expect(html).toContain("Save");
    });
  }
);
