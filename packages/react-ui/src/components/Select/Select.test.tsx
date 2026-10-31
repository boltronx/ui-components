import { screen, waitFor } from "@testing-library/react";
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
    const { data } = renderInForm(<Select label="Fruit" name="fruit" options={fruits} />);
    expect(data().getAll("fruit")).toEqual([""]);
  });

  it("submits the picked value and reports it", async () => {
    const onChange = vi.fn();
    const { data } = renderInForm(
      <Select label="Fruit" name="fruit" options={fruits} onChange={onChange} />
    );
    await userEvent.click(screen.getByRole("combobox", { name: "Fruit" }));
    await pick("Banana");
    expect(data().get("fruit")).toBe("banana");
    expect(onChange).toHaveBeenCalledWith("banana", fruits[1]);
    expect(screen.getByRole("combobox")).toHaveTextContent("Banana");
  });

  it("ignores disabled options", async () => {
    const { data } = renderInForm(<Select label="Fruit" name="fruit" options={fruits} />);
    await userEvent.click(screen.getByRole("combobox"));
    await pick("Cherry");
    expect(data().get("fruit")).toBe("");
  });

  it("submits every value of a multiple select", async () => {
    const { data } = renderInForm(
      <Select label="Fruit" name="fruit" options={fruits} multiple defaultValue={["apple"]} />
    );
    await userEvent.click(screen.getByRole("combobox"));
    await pick("Banana");
    expect(data().getAll("fruit")).toEqual(["apple", "banana"]);
  });

  it("restores defaultValue on form reset", async () => {
    const { data, reset } = renderInForm(
      <Select label="Fruit" name="fruit" options={fruits} defaultValue="apple" />
    );
    await userEvent.click(screen.getByRole("combobox"));
    await pick("Banana");
    expect(data().get("fruit")).toBe("banana");
    await reset();
    expect(data().get("fruit")).toBe("apple");
  });

  it("stays valid after a reset when required with a default value", async () => {
    const { form, reset } = renderInForm(
      <Select label="Fruit" name="fruit" options={fruits} defaultValue="apple" required />
    );
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
    const onChange = vi.fn();
    const select = (value: string) => (
      <Select label="Fruit" name="fruit" options={fruits} value={value} onChange={onChange} />
    );
    const { data, reset, rerenderInForm } = renderInForm(select("apple"));
    await userEvent.click(screen.getByRole("combobox"));
    await pick("Banana");
    // Not applied until the parent updates `value`
    expect(onChange).toHaveBeenCalledWith("banana", fruits[1]);
    expect(data().get("fruit")).toBe("apple");
    rerenderInForm(select("banana"));
    await reset();
    expect(data().get("fruit")).toBe("banana");
  });

  it("is invalid when required and empty", () => {
    const { form } = renderInForm(<Select label="Fruit" name="fruit" options={fruits} required />);
    expect(form.checkValidity()).toBe(false);
  });

  it("validates like a native select: no dropdown, and focus goes to the field", async () => {
    const { form } = renderInForm(
      <>
        <Select label="Fruit" name="fruit" options={fruits} required />
        <Select label="Snack" name="snack" options={fruits} required />
      </>
    );
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
    const { form } = renderInForm(<Select label="Fruit" name="fruit" options={fruits} required />);
    await userEvent.click(screen.getByRole("combobox"));
    await pick("Banana");
    expect(form.checkValidity()).toBe(true);
  });

  it("opens with the keyboard and picks with Enter", async () => {
    const { data } = renderInForm(<Select label="Fruit" name="fruit" options={fruits} />);
    screen.getByRole("combobox").focus();
    await userEvent.keyboard("{ArrowDown}{ArrowDown}{Enter}");
    expect(data().get("fruit")).toBe("banana");
  });
});

describe("Select dropdown", () => {
  it("keeps its dropdown between openings rather than rebuilding it", async () => {
    renderInForm(<Select label="Fruit" name="fruit" options={fruits} />);
    const combobox = screen.getByRole("combobox");
    await userEvent.click(combobox);
    const option = await screen.findByRole("option", { name: "Apple" });
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("option", { name: "Apple" })).toBeNull());
    await userEvent.click(combobox);
    expect(await screen.findByRole("option", { name: "Apple" })).toBe(option);
  });

  it("focuses the search once the dropdown is shown", async () => {
    renderInForm(<Select label="Fruit" options={fruits} searchable />);
    await userEvent.click(screen.getByRole("combobox"));
    await waitFor(() =>
      expect(screen.getByRole("searchbox", { name: "Search options" })).toHaveFocus()
    );
  });

  it("closes without showing the reset list for a moment", async () => {
    renderInForm(<Select label="Fruit" options={fruits} searchable />);
    await userEvent.click(screen.getByRole("combobox"));
    const search = await screen.findByRole("searchbox", { name: "Search options" });
    await userEvent.type(search, "kiwi");
    expect(screen.queryByRole("option")).toBeNull();

    // Closing clears the search; the full list must not show on the way out. It may render into
    // the panel, which stays mounted between openings, but only once the panel is hidden.
    const added: string[] = [];
    const observer = new MutationObserver(records => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (!(node instanceof HTMLElement) || node.closest("[hidden]")) continue;
          if (node.matches('[role="option"]') || node.querySelector('[role="option"]')) {
            added.push(node.outerHTML);
          }
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    await userEvent.keyboard("{Escape}");
    observer.disconnect();
    expect(added).toEqual([]);
    expect(screen.queryByRole("listbox")).toBeNull();
  });
});

describe("Select keyboard", () => {
  const options = [
    { value: "a", label: "Alpha" },
    { value: "b", label: "Beta", disabled: true },
    { value: "c", label: "Gamma" }
  ];

  it("removes a chip with Enter or Space on its remove button, without opening", async () => {
    const onChange = vi.fn();
    const { data } = renderInForm(
      <Select
        multiple
        label="Tags"
        name="tags"
        defaultValue={["a", "c"]}
        options={options}
        onChange={onChange}
      />
    );
    screen.getByRole("button", { name: "Remove Alpha" }).focus();
    await userEvent.keyboard("{Enter}");
    expect(onChange).toHaveBeenLastCalledWith(["c"], options[0]);
    screen.getByRole("button", { name: "Remove Gamma" }).focus();
    await userEvent.keyboard(" ");
    expect(data().getAll("tags")).toEqual([]);
    expect(screen.getByRole("combobox")).toHaveAttribute("aria-expanded", "false");
  });

  it("moves on to the next field when Tab leaves the search", async () => {
    renderInForm(
      <>
        <Select searchable label="Fruit" options={options} />
        <button type="button">Next field</button>
      </>
    );
    await userEvent.click(screen.getByRole("combobox"));
    await waitFor(() => expect(screen.getByRole("searchbox")).toHaveFocus());
    await userEvent.tab();
    expect(screen.getByRole("button", { name: "Next field" })).toHaveFocus();
    expect(screen.getByRole("combobox")).toHaveAttribute("aria-expanded", "false");
  });

  it("passes over disabled options with the arrow keys", async () => {
    const onChange = vi.fn();
    renderInForm(
      <Select
        label="Letter"
        options={[{ value: "x", label: "Ex", disabled: true }, ...options]}
        onChange={onChange}
      />
    );
    screen.getByRole("combobox").focus();
    // Opens on Alpha, the first option that can be picked; Down skips Beta.
    await userEvent.keyboard("{ArrowDown}{ArrowDown}{Enter}");
    expect(onChange).toHaveBeenCalledWith("c", options[2]);
  });
});

describe("Select reopening", () => {
  it("focuses the search on every opening, not just the first", async () => {
    renderInForm(<Select searchable label="Fruit" options={[{ value: "a", label: "Apple" }]} />);
    const combobox = screen.getByRole("combobox");
    for (let opening = 1; opening <= 3; opening++) {
      await userEvent.click(combobox);
      await waitFor(() => expect(screen.getByRole("searchbox")).toHaveFocus());
      await userEvent.keyboard("{Escape}");
      expect(combobox).toHaveFocus();
    }
  });
});
