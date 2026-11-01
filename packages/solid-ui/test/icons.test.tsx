// Every icon a component draws can be swapped through a prop, so apps can match their own icon set.
import { screen } from "@solidjs/testing-library";

import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Autocomplete } from "../src/components/Autocomplete/Autocomplete";
import { DatePicker } from "../src/components/DatePicker/DatePicker";
import { InputPassword } from "../src/components/InputPassword/InputPassword";
import { InputSearch } from "../src/components/InputSearch/InputSearch";
import { message } from "../src/components/Message/Message";
import { Modal } from "../src/components/Modal/Modal";
import { Navlink } from "../src/components/Navlink/Navlink";
import { Select } from "../src/components/Select/Select";
import { SplitButton } from "../src/components/SplitButton/SplitButton";
import { Table } from "../src/components/Table/Table";

import { renderInForm } from "./helpers";

const Custom = (props: { name: string }) => <svg data-testid={props.name} aria-hidden="true" />;

const fruits = [
  { value: "apple", label: "Apple" },
  { value: "banana", label: "Banana" }
];

describe("icon overrides", () => {
  it("Select swaps its chevron, clear cross and option checks", async () => {
    renderInForm(() => (
      <Select
        label="Fruit"
        options={fruits}
        multiple
        defaultValue={["apple", "banana"]}
        chevronIcon={<Custom name="chevron" />}
        clearIcon={<Custom name="clear" />}
        checkIcon={<Custom name="check" />}
      />
    ));
    expect(screen.getByTestId("chevron")).toBeInTheDocument();
    // One cross per chip: the prop renders a fresh icon each time it is read.
    expect(screen.getAllByTestId("clear")).toHaveLength(2);

    await userEvent.click(screen.getByRole("combobox", { name: "Fruit" }));
    expect(await screen.findAllByTestId("check")).toHaveLength(2);
  });

  it("Autocomplete and SplitButton swap their chevrons", () => {
    renderInForm(() => (
      <>
        <Autocomplete label="City" options={[]} chevronIcon={<Custom name="autocomplete" />} />
        <SplitButton chevronIcon={<Custom name="split" />}>Save</SplitButton>
      </>
    ));
    expect(screen.getByTestId("autocomplete")).toBeInTheDocument();
    expect(screen.getByTestId("split")).toBeInTheDocument();
  });

  it("InputSearch swaps its clear cross and keeps the prop off the input", () => {
    renderInForm(() => (
      <InputSearch label="Search" defaultValue="tea" clearIcon={<Custom name="clear" />} />
    ));
    expect(screen.getByRole("button", { name: "Clear search" })).toContainElement(
      screen.getByTestId("clear")
    );
    expect(screen.getByLabelText("Search")).not.toHaveAttribute("clearIcon");
  });

  it("InputPassword asks for the icon of the current visibility", async () => {
    renderInForm(() => (
      <InputPassword
        label="Password"
        visibilityToggleIcon={({ visible }) => <Custom name={visible ? "hide" : "show"} />}
      />
    ));
    expect(screen.getByRole("button", { name: "Show password" })).toContainElement(
      screen.getByTestId("show")
    );
    await userEvent.click(screen.getByRole("button", { name: "Show password" }));
    expect(screen.getByRole("button", { name: "Hide password" })).toContainElement(
      screen.getByTestId("hide")
    );
  });

  it("DatePicker swaps its calendar, clear cross and paging arrows", async () => {
    renderInForm(() => (
      <>
        <DatePicker label="Start" calendarIcon={<Custom name="calendar" />} />
        <DatePicker
          label="Due"
          clearable
          defaultValue="2026-10-05"
          clearIcon={<Custom name="clear" />}
          previousIcon={<Custom name="previous" />}
          nextIcon={<Custom name="next" />}
        />
      </>
    ));
    expect(screen.getByTestId("calendar")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clear date" })).toContainElement(
      screen.getByTestId("clear")
    );

    await userEvent.click(screen.getByLabelText("Due"));
    expect(await screen.findByTestId("previous")).toBeInTheDocument();
    expect(screen.getByTestId("next")).toBeInTheDocument();
  });

  it("Modal.Header, Table and Navlink swap their icons", () => {
    renderInForm(() => (
      <>
        <Modal>
          <Modal.Header title="Edit" closeIcon={<Custom name="close" />} />
        </Modal>
        <Table columns={[]} data={[]} stackBelow={0} emptyIcon={<Custom name="empty" />} />
        <Navlink label="Projects" chevronIcon={<Custom name="chevron" />}>
          <Navlink label="Website" />
        </Navlink>
      </>
    ));
    expect(screen.getByRole("button", { name: "Close" })).toContainElement(
      screen.getByTestId("close")
    );
    expect(screen.getByTestId("empty")).toBeInTheDocument();
    expect(screen.getByTestId("chevron")).toBeInTheDocument();
  });

  it("message takes an icon and a duration together, or a duration alone", () => {
    vi.useFakeTimers();
    try {
      message.success("Saved", { icon: <Custom name="saved" />, seconds: 2 });
      message.info("Heads up", 2);
      expect(screen.getByText("Saved").closest(".bx-Message-item")).toContainElement(
        screen.getByTestId("saved")
      );
      expect(
        screen.getByText("Heads up").closest(".bx-Message-item")!.querySelector("svg")
      ).toBeInTheDocument();

      vi.advanceTimersByTime(2000 + 320);
      expect(screen.queryByText("Saved", { selector: ".bx-Message-text" })).toBeNull();
      expect(screen.queryByText("Heads up", { selector: ".bx-Message-text" })).toBeNull();
    } finally {
      vi.runAllTimers();
      vi.useRealTimers();
    }
  });
});
