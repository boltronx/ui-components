import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useControllableState } from "./form";
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
  it("merges the user's style with additions, leaving out undefined ones", () => {
    expect(mergeStyle({ color: "red" }, { gap: "1px" })).toEqual({ color: "red", gap: "1px" });
    expect(mergeStyle({ marginTop: "2px" }, { gap: undefined })).toEqual({ marginTop: "2px" });
    expect(mergeStyle(undefined, {})).toBeUndefined();
  });

  it("lets the user's style override the component's", () => {
    expect(mergeStyle({ padding: "0" }, { padding: "var(--bx-spacing-md)" })).toEqual({
      padding: "0"
    });
  });

  it("keeps custom property names as written", () => {
    expect(mergeStyle(undefined, { "--bx-gridMin": "1rem" })).toEqual({ "--bx-gridMin": "1rem" });
  });
});

describe("useControllableState", () => {
  it("keeps its own state when uncontrolled and resets to the default", () => {
    const { result, rerender } = renderHook(() =>
      useControllableState<string>({ value: undefined, defaultValue: "a" })
    );
    result.current.setValue("b");
    rerender();
    expect(result.current.value).toBe("b");
    result.current.reset();
    rerender();
    expect(result.current.value).toBe("a");
  });

  it("follows the parent when controlled", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useControllableState<string>({ value, defaultValue: "a" }),
      { initialProps: { value: "x" as string | undefined } }
    );
    result.current.setValue("ignored");
    rerender({ value: "x" });
    expect(result.current.value).toBe("x");
    rerender({ value: "y" });
    expect(result.current.value).toBe("y");
  });
});
