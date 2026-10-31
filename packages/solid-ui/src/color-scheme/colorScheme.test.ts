import { beforeEach, describe, expect, it } from "vitest";

import { colorScheme } from "../vite";

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

describe("useColorScheme", () => {
  it("applies, persists and shares the chosen mode", () => {
    const first = useColorScheme({ key: "test-scheme" });
    const second = useColorScheme({ key: "test-scheme" });
    first.setMode("dark");
    expect(html.getAttribute("data-theme")).toBe("dark");
    expect(localStorage.getItem("test-scheme")).toBe("dark");
    expect(second.mode()).toBe("dark");
    expect(second.scheme()).toBe("dark");
    first.setMode("system");
    expect(second.scheme()).toBe("light");
  });
});

describe("Vite plugin", () => {
  it("injects the script at the top of <head>", () => {
    const [tag] = colorScheme({ defaultMode: "dark" }).transformIndexHtml();
    expect(tag).toMatchObject({ tag: "script", injectTo: "head-prepend" });
    expect(tag?.children).toBe(colorSchemeScript({ defaultMode: "dark" }));
  });
});
