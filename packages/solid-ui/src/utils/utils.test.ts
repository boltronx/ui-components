import { createRoot, createSignal } from "solid-js";

import { describe, expect, it } from "vitest";

import { createControllableSignal } from "./form";
import { cx, mergeStyle, resolveSize } from "./style";

describe("cx", () => {
  it("joins truthy class names", () => {
    expect(cx("a", false, undefined, null, "", "b")).toBe("a b");
  });
});

describe("resolveSize", () => {
  it("maps tokens, numbers and lengths", () => {
    expect(resolveSize("md")).toBe("var(--bx-spacing-md)");
    expect(resolveSize(12)).toBe("12px");
    expect(resolveSize("3rem")).toBe("3rem");
  });
});

describe("mergeStyle", () => {
  it("merges string and object styles with additions", () => {
    expect(mergeStyle("color: red", { gap: "1px" })).toBe("gap: 1px; color: red");
    expect(mergeStyle({ marginTop: "2px" } as never, { gap: undefined })).toBe("margin-top: 2px");
    expect(mergeStyle(undefined, {})).toBeUndefined();
  });

  it("lets the user's style override the component's", () => {
    expect(mergeStyle({ padding: "0" }, { padding: "var(--bx-spacing-md)" })).toBe(
      "padding: var(--bx-spacing-md); padding: 0"
    );
  });

  it("keeps custom property names as written", () => {
    expect(mergeStyle(undefined, { "--bx-gridMin": "1rem" })).toBe("--bx-gridMin: 1rem");
  });

  it("drops values that would add declarations of their own", () => {
    for (const value of [
      "red; background-image: url(https://example.test/x)",
      "red } body { display: none",
      "red /* swallow the rest",
      "url(https://example.test/x",
      'red "unclosed',
      "red\\; color: blue",
      "url(a\\); color: blue"
    ]) {
      expect(mergeStyle(undefined, { color: value, gap: "1px" })).toBe("gap: 1px");
      expect(mergeStyle({ color: value }, {})).toBeUndefined();
    }
  });

  it("drops values whose quoted string is ended early by a newline", () => {
    // CSS ends a string at an unescaped newline, so what follows would be a declaration.
    for (const newline of ["\n", "\r", "\r\n", "\f"]) {
      const value = `"red${newline}; background-image: url(https://example.test/track); --tail: "`;
      expect(mergeStyle(undefined, { color: value, gap: "1px" })).toBe("gap: 1px");
      expect(mergeStyle({ color: value }, {})).toBeUndefined();
    }
    // An escaped newline continues the string.
    expect(mergeStyle(undefined, { content: '"a\\\nb"' })).toBe('content: "a\\\nb"');
  });

  it("drops property names that would add declarations of their own", () => {
    for (const key of ["color: red; background", "color}body{display", "--x;y", "a b"]) {
      expect(mergeStyle({ [key]: "none" } as never, { gap: "1px" })).toBe("gap: 1px");
    }
    expect(mergeStyle({ WebkitLineClamp: "2", "--bx-gap": "1px" } as never, {})).toBe(
      "-webkit-line-clamp: 2; --bx-gap: 1px"
    );
  });

  it("keeps values whose semicolons sit inside brackets or quotes", () => {
    const image = 'url("data:image/svg+xml;utf8,<svg/>")';
    expect(mergeStyle({ "background-image": image }, {})).toBe(`background-image: ${image}`);
    expect(mergeStyle(undefined, { "font-family": '"A;B", serif' })).toBe(
      'font-family: "A;B", serif'
    );
    expect(mergeStyle(undefined, { width: "calc(100% - var(--bx-spacing-md))" })).toBe(
      "width: calc(100% - var(--bx-spacing-md))"
    );
  });

  it("keeps a style string as the caller wrote it", () => {
    expect(mergeStyle("color: red; margin: 0", {})).toBe("color: red; margin: 0");
  });
});

describe("createControllableSignal", () => {
  it("keeps its own state when uncontrolled and resets to the default", () => {
    createRoot(dispose => {
      const state = createControllableSignal({ value: () => undefined, defaultValue: () => "a" });
      state.setValue("b");
      expect(state.value()).toBe("b");
      state.reset();
      expect(state.value()).toBe("a");
      dispose();
    });
  });

  it("follows the parent when controlled", () => {
    createRoot(dispose => {
      const [value, setValue] = createSignal<string | undefined>("x");
      const state = createControllableSignal({ value, defaultValue: () => "a" });
      state.setValue("ignored");
      expect(state.value()).toBe("x");
      setValue("y");
      expect(state.value()).toBe("y");
      dispose();
    });
  });
});
