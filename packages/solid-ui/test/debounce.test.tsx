// Debounced callbacks: what "API ready" means for server search and InputNumber.
import { createRoot } from "solid-js";
import { fireEvent, render, screen } from "@solidjs/testing-library";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Autocomplete, InputNumber, InputSearch, Select } from "../src";
import { createDebouncedCall, createSearchCall } from "../src/utils/debounce";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
});

/** Dropdowns show once positioned, on the next animation frame, which fake timers hold back. */
const nextFrame = () => vi.advanceTimersByTime(20);

describe("createDebouncedCall", () => {
  it("calls once typing pauses, and aborts the previous call's signal", () => {
    const calls: [string, AbortSignal][] = [];
    createRoot(dispose => {
      const call = createDebouncedCall<string>(
        () => (value, signal) => calls.push([value, signal]),
        () => 300
      );
      call.schedule("t");
      call.schedule("te");
      vi.advanceTimersByTime(299);
      expect(calls).toHaveLength(0);
      vi.advanceTimersByTime(1);
      expect(calls.map(([value]) => value)).toEqual(["te"]);

      call.now("tea");
      expect(calls[0]![1].aborted).toBe(true);
      expect(calls[1]![1].aborted).toBe(false);

      // Unmounting aborts the last call and drops a waiting one.
      call.schedule("teas");
      dispose();
      expect(calls[1]![1].aborted).toBe(true);
      vi.advanceTimersByTime(1000);
      expect(calls).toHaveLength(2);
    });
  });
});

describe("createSearchCall", () => {
  function setup(minLength?: number) {
    const sent: string[] = [];
    const signals: AbortSignal[] = [];
    let search!: ReturnType<typeof createSearchCall>;
    createRoot(() => {
      search = createSearchCall({
        callback: () => (value, signal) => {
          sent.push(value);
          signals.push(signal);
        },
        delay: () => undefined,
        minLength: () => minLength
      });
    });
    return { search, sent, signals };
  }

  it("waits 300ms by default", () => {
    const { search, sent } = setup();
    search.schedule("kiwi");
    vi.advanceTimersByTime(299);
    expect(sent).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(sent).toEqual(["kiwi"]);
  });

  it("skips text under the minimum, and aborts the search it replaced", () => {
    const { search, sent, signals } = setup(3);
    search.now("kiwi");
    search.schedule("ki");
    vi.advanceTimersByTime(1000);
    expect(sent).toEqual(["kiwi"]);
    expect(signals[0]!.aborted).toBe(true);
    expect(search.tooShort("ki")).toBe(true);
    // Whitespace doesn't count, and "" is not too short: it resets the search.
    expect(search.tooShort("  k  ")).toBe(true);
    expect(search.tooShort("")).toBe(false);

    search.now("");
    expect(sent).toEqual(["kiwi", ""]);
  });

  it("doesn't repeat the value it last sent, and keeps that request going", () => {
    const { search, sent, signals } = setup();
    // Starts as if "" was sent: the options given are the empty search's.
    search.now("");
    expect(sent).toEqual([]);

    search.now("kiwi");
    search.schedule("kiw");
    search.schedule("kiwi");
    vi.advanceTimersByTime(1000);
    expect(sent).toEqual(["kiwi"]);
    expect(signals[0]!.aborted).toBe(false);
  });
});

describe("Select server search", () => {
  function openSearch(props: Partial<Parameters<typeof Select>[0]> = {}) {
    const onSearchChange = vi.fn();
    render(() => (
      <Select
        label="City"
        searchable
        options={[{ value: "manila", label: "Manila" }]}
        onSearchChange={onSearchChange}
        {...props}
      />
    ));
    fireEvent.click(screen.getByRole("combobox", { name: "City" }));
    nextFrame();
    // Looked up on each call: the dropdown, and the search in it, are created anew on every open.
    const type = (value: string) => {
      const search = screen.getByRole("searchbox", { name: "Search options" });
      fireEvent.input(search, { target: { value } });
    };
    return { onSearchChange, type };
  }

  it("calls once typing pauses, with a signal", () => {
    const { onSearchChange, type } = openSearch();
    type("m");
    type("ma");
    type("man");
    expect(onSearchChange).not.toHaveBeenCalled();
    vi.advanceTimersByTime(300);
    expect(onSearchChange).toHaveBeenCalledTimes(1);
    expect(onSearchChange).toHaveBeenCalledWith("man", expect.any(AbortSignal));
  });

  it("asks for more characters below the minimum instead of searching", () => {
    const { onSearchChange, type } = openSearch({
      onSearchChangeMinLength: 3,
      searchMinLengthMessage: "Type 3 letters"
    });
    type("ma");
    vi.advanceTimersByTime(1000);
    expect(onSearchChange).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent("Type 3 letters");
    expect(screen.queryByRole("option")).toBeNull();

    type("man");
    vi.advanceTimersByTime(300);
    expect(onSearchChange).toHaveBeenCalledWith("man", expect.any(AbortSignal));
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("resets the search right away on close, only if it searched", () => {
    const { onSearchChange, type } = openSearch({ onSearchChangeDebounceMs: 0 });
    fireEvent.keyDown(screen.getByRole("searchbox"), { key: "Escape" });
    expect(onSearchChange).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("combobox", { name: "City" }));
    nextFrame();
    type("man");
    const signal = onSearchChange.mock.calls[0]![1] as AbortSignal;
    fireEvent.keyDown(screen.getByRole("searchbox"), { key: "Escape" });
    expect(onSearchChange).toHaveBeenLastCalledWith("", expect.any(AbortSignal));
    expect(signal.aborted).toBe(true);
  });
});

describe("Autocomplete server search", () => {
  it("waits for typing to pause, and doesn't search a picked suggestion", () => {
    const onSearchChange = vi.fn();
    render(() => (
      <Autocomplete
        label="City"
        options={[{ value: "manila", label: "Manila" }]}
        onSearchChange={onSearchChange}
      />
    ));
    const input = screen.getByLabelText("City");
    fireEvent.focus(input);
    fireEvent.input(input, { target: { value: "ma" } });
    nextFrame();
    expect(onSearchChange).not.toHaveBeenCalled();

    // Picked before the pause ends: neither the typed "ma" nor the picked label is searched.
    fireEvent.click(screen.getByRole("option", { name: "Manila" }));
    vi.advanceTimersByTime(1000);
    expect(onSearchChange).not.toHaveBeenCalled();
    expect(input).toHaveValue("Manila");
  });
});

describe("InputSearch onSearch", () => {
  it("debounces typing, searches on Enter and on clear, and leaves onInput native", () => {
    const onSearch = vi.fn();
    const onInput = vi.fn();
    render(() => <InputSearch label="Search" onSearch={onSearch} onInput={onInput} />);
    const input = screen.getByLabelText("Search");

    fireEvent.input(input, { target: { value: "t" } });
    fireEvent.input(input, { target: { value: "te" } });
    expect(onInput).toHaveBeenCalledTimes(2);
    expect(onSearch).not.toHaveBeenCalled();

    fireEvent.keyDown(input, { key: "Enter" });
    expect(onSearch).toHaveBeenCalledWith("te", expect.any(AbortSignal));
    vi.advanceTimersByTime(1000);
    expect(onSearch).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
    expect(onSearch).toHaveBeenLastCalledWith("", expect.any(AbortSignal));
    expect(onSearch).toHaveBeenCalledTimes(2);
  });

  it("respects onSearchMinLength", () => {
    const onSearch = vi.fn();
    render(() => <InputSearch label="Search" onSearch={onSearch} onSearchMinLength={3} />);
    const input = screen.getByLabelText("Search");
    fireEvent.input(input, { target: { value: "te" } });
    fireEvent.keyDown(input, { key: "Enter" });
    vi.advanceTimersByTime(1000);
    expect(onSearch).not.toHaveBeenCalled();
    fireEvent.input(input, { target: { value: "tea" } });
    vi.advanceTimersByTime(300);
    expect(onSearch).toHaveBeenCalledWith("tea", expect.any(AbortSignal));
  });
});

describe("InputNumber onInput", () => {
  it("still debounces 400ms, reports on blur right away, and now passes a signal", () => {
    const onInput = vi.fn();
    render(() => <InputNumber label="Amount" onInput={onInput} />);
    const input = screen.getByLabelText("Amount");
    fireEvent.focus(input);
    fireEvent.input(input, { target: { value: "12" } });
    vi.advanceTimersByTime(399);
    expect(onInput).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onInput).toHaveBeenCalledWith(12, expect.any(AbortSignal));

    fireEvent.input(input, { target: { value: "123" } });
    fireEvent.blur(input);
    expect(onInput).toHaveBeenLastCalledWith(123, expect.any(AbortSignal));
    expect((onInput.mock.calls[0]![1] as AbortSignal).aborted).toBe(true);
  });
});
