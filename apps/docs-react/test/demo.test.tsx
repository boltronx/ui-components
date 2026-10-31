import { act } from "react";
import { createRoot } from "react-dom/client";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Demo } from "../src/Demo";

const demo = { id: "d", title: "Demo", component: () => <p>Preview</p>, source: "<Preview />" };

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;

beforeEach(async () => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => root.render(<Demo demo={demo} />));
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

const button = (text: string) =>
  [...container.querySelectorAll("button")].find(element => element.textContent === text);

async function copy() {
  await act(async () => button("Show code")!.click());
  await act(async () => button("Copy")!.click());
}

describe("Demo copy button", () => {
  it("says the code was copied", async () => {
    const writeText = vi.fn(() => Promise.resolve());
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    await copy();
    expect(writeText).toHaveBeenCalledWith("<Preview />");
    expect(button("Copied")).toBeDefined();
  });

  it("says when the clipboard refuses, instead of an unhandled rejection", async () => {
    vi.stubGlobal("navigator", {
      clipboard: { writeText: () => Promise.reject(new Error("denied")) }
    });
    await copy();
    expect(button("Copy failed")).toBeDefined();
  });

  it("says when there is no clipboard, as outside a secure context", async () => {
    vi.stubGlobal("navigator", {});
    await copy();
    expect(button("Copy failed")).toBeDefined();
  });
});
