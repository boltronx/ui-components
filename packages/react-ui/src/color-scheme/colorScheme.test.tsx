import { act, render, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { colorScheme } from "../vite";

import { ColorSchemeScript } from "./ColorSchemeScript";
import { colorSchemeScript } from "./script";
import { useColorScheme } from "./useColorScheme";

const html = document.documentElement;

beforeEach(() => {
  localStorage.clear();
  html.removeAttribute("data-theme");
});

describe("colorSchemeScript", () => {
  it("applies the saved mode", () => {
    localStorage.setItem("bx-color-scheme", "dark");
    new Function(colorSchemeScript())();
    expect(html.getAttribute("data-theme")).toBe("dark");
  });

  it("falls back to defaultMode, resolving system from the OS", () => {
    new Function(colorSchemeScript({ defaultMode: "system" }))();
    // The test environment reports a light OS.
    expect(html.getAttribute("data-theme")).toBe("light");
    new Function(colorSchemeScript({ defaultMode: "dark" }))();
    expect(html.getAttribute("data-theme")).toBe("dark");
  });

  it("ignores invalid saved values", () => {
    localStorage.setItem("bx-color-scheme", "purple");
    new Function(colorSchemeScript({ defaultMode: "light" }))();
    expect(html.getAttribute("data-theme")).toBe("light");
  });

  it("cannot close its <script> tag through the key", () => {
    expect(colorSchemeScript({ key: "</script><b>" })).not.toContain("</script>");
  });
});

describe("ColorSchemeScript", () => {
  it("renders the script inline, with a nonce", () => {
    const { container } = render(<ColorSchemeScript defaultMode="dark" nonce="abc" />);
    const script = container.querySelector("script")!;
    expect(script.innerHTML).toBe(colorSchemeScript({ defaultMode: "dark" }));
    expect(script).toHaveAttribute("nonce", "abc");
  });

  it("reads the storageKey, since React keeps key for itself", () => {
    const { container } = render(<ColorSchemeScript storageKey="app-theme" />);
    expect(container.querySelector("script")!.innerHTML).toBe(
      colorSchemeScript({ key: "app-theme" })
    );
  });
});

describe("useColorScheme", () => {
  it("applies, persists and shares the chosen mode", () => {
    const first = renderHook(() => useColorScheme({ key: "test-scheme" }));
    const second = renderHook(() => useColorScheme({ key: "test-scheme" }));
    act(() => first.result.current.setMode("dark"));
    expect(html.getAttribute("data-theme")).toBe("dark");
    expect(localStorage.getItem("test-scheme")).toBe("dark");
    expect(second.result.current.mode).toBe("dark");
    expect(second.result.current.scheme).toBe("dark");
    act(() => first.result.current.setMode("system"));
    expect(second.result.current.scheme).toBe("light");
  });

  it("picks up a mode saved before the page loaded", () => {
    localStorage.setItem("saved-scheme", "dark");
    const { result } = renderHook(() => useColorScheme({ key: "saved-scheme" }));
    expect(result.current.mode).toBe("dark");
    expect(html.getAttribute("data-theme")).toBe("dark");
  });

  it("changes <html> only once React has committed, never during render", () => {
    localStorage.setItem("render-scheme", "dark");
    const seenDuringRender: (string | null)[] = [];
    renderHook(() => {
      const state = useColorScheme({ key: "render-scheme" });
      seenDuringRender.push(html.getAttribute("data-theme"));
      return state;
    });
    expect(seenDuringRender[0]).toBeNull();
    expect(html.getAttribute("data-theme")).toBe("dark");
  });

  it("follows another tab's change once subscribed", () => {
    const { result } = renderHook(() => useColorScheme({ key: "tab-scheme" }));
    act(() => {
      window.dispatchEvent(new StorageEvent("storage", { key: "tab-scheme", newValue: "dark" }));
    });
    expect(result.current.mode).toBe("dark");
    expect(html.getAttribute("data-theme")).toBe("dark");
  });
});

describe("Vite plugin", () => {
  it("injects the script at the top of <head>", () => {
    const [tag] = colorScheme({ defaultMode: "dark" }).transformIndexHtml();
    expect(tag).toMatchObject({ tag: "script", injectTo: "head-prepend" });
    expect(tag?.children).toBe(colorSchemeScript({ defaultMode: "dark" }));
  });
});
