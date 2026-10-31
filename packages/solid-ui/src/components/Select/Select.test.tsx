import { createSignal } from "solid-js";
import { screen, waitFor } from "@solidjs/testing-library";

import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { renderInForm } from "../../../test/helpers";

import { Select } from "./Select";

const fruits = [
  { value: "apple", label: "Apple" },
  { value: "banana", label: "Banana" },
  { value: "cherry", label: "Cherry", disabled: true }
];

async function pick(label: string) {
  // findBy: the dropdown becomes visible once positioned, on the next animation frame.
  await userEvent.click(await screen.findByRole("option", { name: label }));
}

describe("Select", () => {
  it("submits one empty entry before anything is picked", () => {
    const { data } = renderInForm(() => <Select label="Fruit" name="fruit" options={fruits} />);
    expect(data().getAll("fruit")).toEqual([""]);
  });

  it("submits the picked value and reports it", async () => {
    const onChange = vi.fn();
    const { data } = renderInForm(() => (
      <Select label="Fruit" name="fruit" options={fruits} onChange={onChange} />
    ));
    await userEvent.click(screen.getByRole("combobox", { name: "Fruit" }));
    await pick("Banana");
    expect(data().get("fruit")).toBe("banana");
    expect(onChange).toHaveBeenCalledWith("banana", fruits[1]);
    expect(screen.getByRole("combobox")).toHaveTextContent("Banana");
  });

  it("keeps its dropdown between openings rather than rebuilding it", async () => {
    renderInForm(() => <Select label="Fruit" name="fruit" options={fruits} />);
    const combobox = screen.getByRole("combobox");
    await userEvent.click(combobox);
    const option = await screen.findByRole("option", { name: "Apple" });
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(option).not.toBeInTheDocument());
    await userEvent.click(combobox);
    expect(await screen.findByRole("option", { name: "Apple" })).toBe(option);
  });

  it("ignores disabled options", async () => {
    const { data } = renderInForm(() => <Select label="Fruit" name="fruit" options={fruits} />);
    await userEvent.click(screen.getByRole("combobox"));
    await pick("Cherry");
    expect(data().get("fruit")).toBe("");
  });

  it("submits every value of a multiple select", async () => {
    const { data } = renderInForm(() => (
      <Select label="Fruit" name="fruit" options={fruits} multiple defaultValue={["apple"]} />
    ));
    await userEvent.click(screen.getByRole("combobox"));
    await pick("Banana");
    expect(data().getAll("fruit")).toEqual(["apple", "banana"]);
  });

  it("restores defaultValue on form reset", async () => {
    const { data, reset } = renderInForm(() => (
      <Select label="Fruit" name="fruit" options={fruits} defaultValue="apple" />
    ));
    await userEvent.click(screen.getByRole("combobox"));
    await pick("Banana");
    expect(data().get("fruit")).toBe("banana");
    await reset();
    expect(data().get("fruit")).toBe("apple");
  });

  it("stays valid after a reset when required with a default value", async () => {
    const { form, reset } = renderInForm(() => (
      <Select label="Fruit" name="fruit" options={fruits} defaultValue="apple" required />
    ));
    // Untouched, and then picked and reset, in the order a user's reset click runs things.
    await reset();
    expect(form.checkValidity()).toBe(true);

    await userEvent.click(screen.getByRole("combobox"));
    await pick("Banana");
    await reset();
    expect(form.checkValidity()).toBe(true);
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("leaves a controlled value to the parent", async () => {
    const [value, setValue] = createSignal("apple");
    const onChange = vi.fn();
    const { data, reset } = renderInForm(() => (
      <Select label="Fruit" name="fruit" options={fruits} value={value()} onChange={onChange} />
    ));
    await userEvent.click(screen.getByRole("combobox"));
    await pick("Banana");
    // Not applied until the parent updates `value`
    expect(onChange).toHaveBeenCalledWith("banana", fruits[1]);
    expect(data().get("fruit")).toBe("apple");
    setValue("banana");
    await reset();
    expect(data().get("fruit")).toBe("banana");
  });

  it("is invalid when required and empty", () => {
    const { form } = renderInForm(() => (
      <Select label="Fruit" name="fruit" options={fruits} required />
    ));
    expect(form.checkValidity()).toBe(false);
  });

  it("validates like a native select: no dropdown, and focus goes to the field", async () => {
    const { form } = renderInForm(() => (
      <>
        <Select label="Fruit" name="fruit" options={fruits} required />
        <Select label="Snack" name="snack" options={fruits} required />
      </>
    ));
    // The browser shows its own bubble on the first invalid field; Select stays closed.
    form.requestSubmit();
    expect(screen.queryByRole("listbox")).toBeNull();

    // Validation focuses the native select, which hands focus to the combobox.
    const validator = form.querySelector<HTMLSelectElement>("select.bx-Select-validator")!;
    expect(validator.required).toBe(true);
    validator.focus();
    expect(screen.getByRole("combobox", { name: "Fruit" })).toHaveFocus();
  });

  it("is valid once a value is picked", async () => {
    const { form } = renderInForm(() => (
      <Select label="Fruit" name="fruit" options={fruits} required />
    ));
    await userEvent.click(screen.getByRole("combobox"));
    await pick("Banana");
    expect(form.checkValidity()).toBe(true);
  });

  it("opens with the keyboard and picks with Enter", async () => {
    const { data } = renderInForm(() => <Select label="Fruit" name="fruit" options={fruits} />);
    screen.getByRole("combobox").focus();
    await userEvent.keyboard("{ArrowDown}{ArrowDown}{Enter}");
    expect(data().get("fruit")).toBe("banana");
  });
});

describe("Select keyboard and focus", () => {
  it("leaves Enter and Space on a chip's remove button to that button", async () => {
    const { data } = renderInForm(() => (
      <Select
        label="Fruits"
        name="fruits"
        options={fruits}
        multiple
        defaultValue={["apple", "banana"]}
      />
    ));
    screen.getByRole("button", { name: "Remove Apple" }).focus();
    await userEvent.keyboard("{Enter}");
    expect(data().getAll("fruits")).toEqual(["banana"]);
    screen.getByRole("button", { name: "Remove Banana" }).focus();
    await userEvent.keyboard(" ");
    expect(data().getAll("fruits")).toEqual([]);
    expect(screen.getByRole("combobox")).toHaveAttribute("aria-expanded", "false");
  });

  it("moves Tab on from the field, not off the page, when the search has focus", async () => {
    renderInForm(() => (
      <>
        <Select label="Fruit" options={fruits} searchable />
        <button type="button">Next</button>
      </>
    ));
    const combobox = screen.getByRole("combobox", { name: "Fruit" });
    combobox.focus();
    await userEvent.keyboard("{Enter}");
    await waitFor(() => expect(screen.getByRole("searchbox")).toHaveFocus());
    await userEvent.tab();
    expect(screen.getByRole("button", { name: "Next" })).toHaveFocus();
    expect(combobox).toHaveAttribute("aria-expanded", "false");
  });

  it("puts focus back on the field after picking from the search", async () => {
    renderInForm(() => <Select label="Fruit" options={fruits} searchable />);
    const combobox = screen.getByRole("combobox", { name: "Fruit" });
    combobox.focus();
    await userEvent.keyboard("{Enter}");
    await waitFor(() => expect(screen.getByRole("searchbox")).toHaveFocus());
    await userEvent.keyboard("{ArrowDown}{Enter}");
    expect(combobox).toHaveTextContent("Banana");
    expect(combobox).toHaveFocus();
  });

  it("passes over disabled options with the arrow keys", async () => {
    const options = [
      { value: "apple", label: "Apple", disabled: true },
      { value: "banana", label: "Banana" },
      { value: "cherry", label: "Cherry", disabled: true },
      { value: "date", label: "Date" }
    ];
    renderInForm(() => <Select label="Fruit" options={options} />);
    const combobox = screen.getByRole("combobox", { name: "Fruit" });
    const active = () =>
      document.getElementById(combobox.getAttribute("aria-activedescendant") ?? "")?.textContent;
    combobox.focus();
    await userEvent.keyboard("{Enter}");
    // Opens on the first option that can be picked.
    expect(active()).toBe("Banana");
    await userEvent.keyboard("{ArrowDown}");
    expect(active()).toBe("Date");
    await userEvent.keyboard("{ArrowDown}");
    expect(active()).toBe("Banana");
    await userEvent.keyboard("{ArrowUp}");
    expect(active()).toBe("Date");
  });
});
