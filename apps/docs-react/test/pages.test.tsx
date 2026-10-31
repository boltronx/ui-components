// Renders every docs page and demo, so a demo that throws or warns fails CI instead of the site.
import { act, StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { App } from "../src/App";
import { componentSections } from "../src/registry";

const routes = ["/", "/forms", "/theming", ...componentSections.map(s => `/components/${s.slug}`)];

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
const errors: unknown[][] = [];

beforeAll(async () => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  vi.spyOn(console, "error").mockImplementation((...args) => errors.push(args));
  vi.spyOn(console, "warn").mockImplementation((...args) => errors.push(args));
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  // StrictMode, as in main.tsx: it runs state updaters twice, which catches demos that read an
  // event after it has finished.
  await act(async () =>
    root.render(
      <StrictMode>
        <App />
      </StrictMode>
    )
  );
});

afterAll(() => act(() => root.unmount()));

describe("docs", () => {
  it.each(routes)("renders %s without errors", async route => {
    await act(async () => {
      window.location.hash = route;
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });
    expect(container.querySelector("h1")).not.toBeNull();
    expect(container.textContent).not.toContain("Page not found");
    expect(errors).toEqual([]);
  });

  it.each(routes)("survives clicking every checkbox and switch on %s", async route => {
    await act(async () => {
      window.location.hash = route;
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });
    const boxes = container.querySelectorAll<HTMLInputElement>(
      "input[type=checkbox]:not(:disabled)"
    );
    for (const box of boxes) await act(async () => box.click());
    expect(container.querySelector("h1")).not.toBeNull();
    expect(errors).toEqual([]);
  });
});
