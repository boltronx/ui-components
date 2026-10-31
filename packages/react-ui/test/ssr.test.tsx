// @vitest-environment node
// Server rendering, as Next.js and other SSR frameworks do it: in Node, with no window or
// document. Importing the package and rendering every component must not touch browser APIs.
import { renderToString } from "react-dom/server";

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
    try {
      const html = renderToString(<KitchenSink />);
      expect(html).toContain('class="bx-Button"');
      expect(html).toContain("bx-Select-control");
      expect(errors).not.toHaveBeenCalled();
    } finally {
      errors.mockRestore();
    }
  });

  it("renders form values into the HTML, so fields are filled before hydration", () => {
    const html = renderToString(<KitchenSink />);
    expect(html).toMatch(/<input[^>]*value="Ada"/);
    // Grouped for display, plain in the hidden input the form submits.
    expect(html).toContain('value="1,234.50"');
    expect(html).toMatch(/type="hidden" name="amount" value="1234.5"/);
    expect(html).toMatch(/type="hidden" name="fruit" value="apple"/);
    expect(html).toContain('value="Oct 5, 2026"');
  });

  it("renders the default color scheme, since the saved one is only known in the browser", () => {
    expect(renderToString(<KitchenSink />)).toContain("Theme: <!-- -->light");
  });

  it("leaves dropdowns, tooltips and portals out of the server HTML", () => {
    const html = renderToString(<KitchenSink />);
    expect(html).not.toContain("bx-FloatingPanel");
    expect(html).not.toContain('role="listbox" aria-multiselectable="false"><div');
  });

  it("imports the imperative APIs on the server without running them", () => {
    expect(typeof message.success).toBe("function");
    expect(typeof modal.open).toBe("function");
  });
});
