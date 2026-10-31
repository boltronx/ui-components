// Props written as conditions (`disabled={a() && b()}`) compile to getters that create a memo on
// each read. Read in an event handler, a listener or a timer, which have no reactive owner, that
// memo is never disposed, and Solid warns. Components read such props through memos made when
// they are created; these interactions would warn otherwise.
import { createSignal } from "solid-js";
import { render, screen, waitFor } from "@solidjs/testing-library";

import { userEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from "vitest";

import {
  Autocomplete,
  Button,
  DatePicker,
  Input,
  InputNumber,
  InputSearch,
  Menu,
  MenuDropdown,
  MenuItem,
  MenuTarget,
  Navlink,
  Pagination,
  Select,
  SplitButton,
  Textarea
} from "../src";

import { renderInForm } from "./helpers";

const LEAK = "outside a `createRoot`";
let warn: MockInstance<typeof console.warn>;

beforeEach(() => {
  warn = vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  warn.mockRestore();
});

function expectNoLeaks() {
  expect(warn.mock.calls.filter(call => String(call[0]).includes(LEAK))).toEqual([]);
}

// A signal the conditions test. Solid wraps a condition in a memo only when a branch calls
// something, as in `picked().length > 0 && !all()`, so each branch here goes through `is`.
const [off] = createSignal(false);
const is = <T,>(value: T) => value;

describe("props written as conditions", () => {
  it("Button, SplitButton, Menu and Navlink", async () => {
    render(() => (
      <>
        <Button loading={off() && is(true)}>Save</Button>
        <SplitButton
          disabled={off() && is(true)}
          loading={off() || is(false)}
          dropdown={<MenuItem disabled={off() && is(true)}>Draft</MenuItem>}
        >
          Send
        </SplitButton>
        <Menu position={off() ? is("top") : is("bottom")}>
          <MenuTarget>
            <Button>Actions</Button>
          </MenuTarget>
          <MenuDropdown>
            <MenuItem disabled={off() && is(true)}>Edit</MenuItem>
          </MenuDropdown>
        </Menu>
        <Navlink
          label="Group"
          disabled={off() && is(true)}
          opened={off() ? is(true) : is(undefined)}
        >
          <Navlink label="Child" href="#child" />
        </Navlink>
      </>
    ));
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    await userEvent.click(screen.getByRole("button", { name: "Send" }));
    await userEvent.click(screen.getByRole("button", { name: "Actions" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Edit" }));
    await userEvent.click(screen.getByRole("button", { name: "Group" }));
    screen.getByRole("button", { name: "Group" }).focus();
    await userEvent.keyboard("{Enter}");
    expectNoLeaks();
  });

  it("Select and Autocomplete", async () => {
    const options = [
      { value: "a", label: "Apple" },
      { value: "b", label: "Banana" }
    ];
    const { reset } = renderInForm(() => (
      <>
        <Select
          label="Fruit"
          options={options}
          disabled={off() && is(true)}
          multiple={off() && is(true)}
          clearable={is(true) && !off()}
          defaultValue={off() ? is("b") : is("a")}
          searchable
          onSearchChange={off() ? is(undefined) : is(() => {})}
          onSearchChangeDebounceMs={off() ? is(10) : is(0)}
          onSearchChangeMinLength={off() ? is(3) : is(1)}
        />
        <Autocomplete
          label="Snack"
          options={options}
          disabled={off() && is(true)}
          nothingFoundMessage={off() ? is(undefined) : is("None")}
          loading={off() && is(true)}
          value={off() ? is("x") : is(undefined)}
        />
      </>
    ));
    const select = screen.getByRole("combobox", { name: "Fruit" });
    select.focus();
    await userEvent.keyboard("{Enter}");
    await waitFor(() => expect(screen.getByRole("searchbox")).toHaveFocus());
    await userEvent.keyboard("b{ArrowDown}{Enter}");
    select.focus();
    await userEvent.keyboard("{Backspace}");
    await userEvent.type(screen.getByRole("combobox", { name: "Snack" }), "zz{ArrowDown}{Escape}");
    await reset();
    expectNoLeaks();
  });

  it("DatePicker and InputNumber", async () => {
    const { reset } = renderInForm(() => (
      <>
        <DatePicker
          label="Due"
          defaultValue="2026-10-05"
          min={off() ? is("2026-10-10") : is("2026-01-01")}
          max={off() ? is(undefined) : is("2026-12-31")}
          clearable={is(true) && !off()}
          disabled={off() && is(true)}
        />
        <InputNumber
          label="Amount"
          decimals={off() ? is(0) : is(2)}
          max={off() ? is(1) : is(100)}
          min={off() ? is(1) : is(0)}
          value={off() ? is(5) : is(undefined)}
          onInput={off() ? is(undefined) : is(() => {})}
          onInputDebounceMs={off() ? is(10) : is(0)}
        />
      </>
    ));
    const due = screen.getByRole("combobox", { name: "Due" });
    due.focus();
    await userEvent.keyboard("{Enter}{ArrowRight}{Enter}{Backspace}");
    await userEvent.type(screen.getByLabelText("Amount"), "12.5");
    await userEvent.tab();
    await reset();
    expectNoLeaks();
  });

  it("Input, Textarea, InputSearch and Pagination", async () => {
    const [page, setPage] = createSignal<number | undefined>(2);
    const { reset } = renderInForm(() => (
      <>
        <Input label="Name" value={off() ? is("x") : is("Ada")} />
        <Textarea
          label="Notes"
          value={off() ? is("x") : is("Hi")}
          submitOnEnter={is(true) && !off()}
          autoSize={is(true) && !off()}
          maxRows={off() ? is(2) : is(4)}
        />
        <InputSearch
          label="Find"
          onSearch={off() ? is(undefined) : is(() => {})}
          onSearchDebounceMs={off() ? is(10) : is(0)}
          onSearchMinLength={off() ? is(3) : is(1)}
        />
        <Pagination page={page() ?? is(1)} totalPages={5} onChange={setPage} />
      </>
    ));
    await userEvent.type(screen.getByLabelText("Notes"), "!{Enter}");
    await userEvent.type(screen.getByLabelText("Find"), "ab{Enter}");
    await userEvent.click(screen.getByRole("button", { name: "Next page" }));
    await userEvent.click(screen.getByRole("button", { name: "Previous page" }));
    await reset();
    expectNoLeaks();
  });
});
