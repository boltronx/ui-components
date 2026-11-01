import { screen } from "@solidjs/testing-library";

import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { renderInForm } from "../../../test/helpers";
import { ReadOnlyProvider } from "../ReadOnly/ReadOnly";

import { InputSearch } from "./InputSearch";

describe("InputSearch", () => {
  it("searches on Enter, but not on the Enter that confirms IME text", () => {
    const onSearch = vi.fn();
    renderInForm(() => <InputSearch label="Search" onSearch={onSearch} />);
    const input = screen.getByLabelText("Search") as HTMLInputElement;
    input.value = "東京";
    const enter = (init: KeyboardEventInit) =>
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, ...init }));
    enter({ isComposing: true });
    enter({ keyCode: 229 });
    expect(onSearch).not.toHaveBeenCalled();
    enter({});
    expect(onSearch).toHaveBeenCalledWith("東京", expect.any(AbortSignal));
  });

  it("shows a clear button once there is text, and clearing fires onInput", async () => {
    const onInput = vi.fn();
    const { data } = renderInForm(() => <InputSearch label="Search" name="q" onInput={onInput} />);
    const input = screen.getByLabelText("Search");
    expect(screen.queryByRole("button", { name: "Clear search" })).toBeNull();

    await userEvent.type(input, "cebu");
    expect(data().get("q")).toBe("cebu");
    onInput.mockClear();

    await userEvent.click(screen.getByRole("button", { name: "Clear search" }));
    expect(input).toHaveValue("");
    expect(input).toHaveFocus();
    expect(onInput).toHaveBeenCalledOnce();
    expect(data().get("q")).toBe("");
    expect(screen.queryByRole("button", { name: "Clear search" })).toBeNull();
  });

  it("drops the clear button when the form resets to an empty value", async () => {
    const { reset } = renderInForm(() => <InputSearch label="Search" defaultValue="" />);
    await userEvent.type(screen.getByLabelText("Search"), "x");
    expect(screen.getByRole("button", { name: "Clear search" })).toBeInTheDocument();
    await reset();
    expect(screen.queryByRole("button", { name: "Clear search" })).toBeNull();
  });

  it("follows a controlled value", () => {
    renderInForm(() => <InputSearch label="Search" value="manila" />);
    expect(screen.getByRole("button", { name: "Clear search" })).toBeInTheDocument();
  });

  it("hides the clear button when disabled or read-only", () => {
    renderInForm(() => (
      <>
        <InputSearch label="Disabled" defaultValue="a" disabled />
        <InputSearch label="Read-only" defaultValue="b" readOnly />
      </>
    ));
    expect(screen.queryByRole("button", { name: "Clear search" })).toBeNull();
  });

  it("has no clear button inside a ReadOnlyProvider", () => {
    renderInForm(() => (
      <ReadOnlyProvider readOnly>
        <InputSearch aria-label="Search" defaultValue="shoes" />
      </ReadOnlyProvider>
    ));
    expect(screen.queryByRole("button", { name: "Clear search" })).toBeNull();
  });
});

describe("InputSearch edge cases", () => {
  it("drops a queued search and aborts a running one when the form resets", async () => {
    const onSearch = vi.fn();
    const { reset } = renderInForm(() => (
      <InputSearch label="Search" onSearch={onSearch} onSearchDebounceMs={300} />
    ));
    const input = screen.getByLabelText("Search");
    await userEvent.type(input, "ceb{Enter}");
    const signal = onSearch.mock.lastCall![1] as AbortSignal;
    await userEvent.type(input, "u");
    onSearch.mockClear();

    await reset();
    await new Promise(resolve => setTimeout(resolve, 400));
    expect(signal.aborted).toBe(true);
    expect(onSearch).not.toHaveBeenCalled();
  });

  it("calls a bound onKeyDown handler with its data", async () => {
    const onKeyDown = vi.fn();
    renderInForm(() => <InputSearch label="Search" onKeyDown={[onKeyDown, "row-1"]} />);
    await userEvent.type(screen.getByLabelText("Search"), "a");
    expect(onKeyDown).toHaveBeenCalledWith("row-1", expect.any(KeyboardEvent));
  });
});
