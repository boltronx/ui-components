import { createSignal } from "solid-js";
import { render, screen } from "@solidjs/testing-library";

import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { renderInForm } from "../../../test/helpers";
import { focusFirstInvalid } from "../../utils/form";
import { Switch } from "../Switch/Switch";

import { Checkbox } from "./Checkbox";

describe("Checkbox", () => {
  it("submits its value when checked", async () => {
    const { data } = renderInForm(() => <Checkbox label="Agree" name="agree" value="yes" />);
    expect(data().get("agree")).toBeNull();
    await userEvent.click(screen.getByLabelText("Agree"));
    expect(data().get("agree")).toBe("yes");
  });

  it("restores defaultChecked on form reset", async () => {
    const { reset } = renderInForm(() => <Checkbox label="Agree" name="agree" defaultChecked />);
    const box = screen.getByLabelText("Agree");
    await userEvent.click(box);
    expect(box).not.toBeChecked();
    await reset();
    expect(box).toBeChecked();
  });

  it("keeps a controlled state until the parent changes it", async () => {
    const onChange = vi.fn();
    renderInForm(() => <Checkbox label="Agree" checked={false} onChange={onChange} />);
    const box = screen.getByLabelText("Agree");
    await userEvent.click(box);
    await Promise.resolve();
    expect(onChange).toHaveBeenCalledOnce();
    expect(box).not.toBeChecked();
  });

  it("does not toggle when read-only", async () => {
    renderInForm(() => <Checkbox label="Agree" readOnly />);
    const box = screen.getByLabelText("Agree");
    await userEvent.click(box);
    expect(box).not.toBeChecked();
  });

  it("is announced as a checkbox", () => {
    renderInForm(() => <Checkbox label="Agree" />);
    expect(screen.getByRole("checkbox", { name: "Agree" })).not.toHaveAttribute("role");
  });

  it("can be named without a visible label", () => {
    renderInForm(() => (
      <>
        <span id="row-name">Order SO-1042</span>
        <Checkbox aria-label="Select all orders" />
        <Checkbox aria-labelledby="row-name" />
      </>
    ));
    expect(screen.getByRole("checkbox", { name: "Select all orders" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Order SO-1042" })).toBeInTheDocument();
    // No empty body beside a box that has nothing to show.
    expect(document.querySelector(".bx-Checkbox-body")).toBeNull();
  });

  it("shows an error, marks the box invalid and describes it", async () => {
    const [error, setError] = createSignal<string>();
    renderInForm(() => (
      <Checkbox label="Accept the terms" description="Required to continue" error={error()} />
    ));
    const box = screen.getByRole("checkbox", { name: "Accept the terms" });
    expect(box).not.toHaveAttribute("aria-invalid");
    expect(box).toHaveAccessibleDescription("Required to continue");
    setError("Accept the terms to continue");
    expect(box).toHaveAttribute("aria-invalid", "true");
    expect(box).toHaveAccessibleDescription("Required to continue Accept the terms to continue");
    expect(await focusFirstInvalid()).toBe(box);
  });
});

describe("Checkbox options", () => {
  it("shows the indeterminate dash, and puts it back after a click clears it", async () => {
    const onChange = vi.fn();
    renderInForm(() => <Checkbox label="All" checked={false} indeterminate onChange={onChange} />);
    const box = screen.getByLabelText<HTMLInputElement>("All");
    expect(box.indeterminate).toBe(true);
    expect(box).toBePartiallyChecked();
    await userEvent.click(box);
    expect(onChange).toHaveBeenCalledOnce();
    // The parent kept `indeterminate`, so it is still shown.
    expect(box.indeterminate).toBe(true);
  });

  it("puts the label on the left", () => {
    renderInForm(() => <Checkbox label="Agree" labelPosition="left" />);
    expect(screen.getByLabelText("Agree").closest(".bx-Checkbox")).toHaveAttribute(
      "data-label-position",
      "left"
    );
  });
});

describe("Checkbox row clicks", () => {
  it("toggles from its description, but not from a link inside it", async () => {
    render(() => (
      <Checkbox
        label="Accept"
        description={
          <>
            You agree to the <a href="#terms">terms</a>.
          </>
        }
      />
    ));
    const box = screen.getByRole("checkbox", { name: "Accept" });
    await userEvent.click(screen.getByRole("link", { name: "terms" }));
    expect(box).not.toBeChecked();
    await userEvent.click(screen.getByText(/You agree/));
    expect(box).toBeChecked();
  });

  it("toggles from its description inside a focusable container, e.g. a Modal's dialog", async () => {
    render(() => (
      <section tabindex="-1">
        <Checkbox label="Accept" description="Required to continue" />
        <Switch label="Alerts" description="Sent by email" />
      </section>
    ));
    await userEvent.click(screen.getByText("Required to continue"));
    expect(screen.getByRole("checkbox", { name: "Accept" })).toBeChecked();
    await userEvent.click(screen.getByText("Sent by email"));
    expect(screen.getByRole("switch", { name: "Alerts" })).toBeChecked();
  });

  it("leaves a click to an enclosing label, so it toggles once", async () => {
    render(() => (
      <label>
        <div tabindex="-1">
          <Checkbox aria-label="Accept" description="Required to continue" />
        </div>
      </label>
    ));
    await userEvent.click(screen.getByText("Required to continue"));
    expect(screen.getByRole("checkbox", { name: "Accept" })).toBeChecked();
  });
});

describe("Checkbox props written as conditions", () => {
  it("doesn't create computations outside a root when its handlers read them", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const toppings = ["Cheese", "Olives"];
      const [picked, setPicked] = createSignal<string[]>(["Cheese"]);
      const [locked] = createSignal(false);
      const all = () => picked().length === toppings.length;
      render(() => (
        <>
          <Checkbox
            label="All toppings"
            checked={all()}
            // A condition, which Solid compiles into a getter that creates a memo per read.
            indeterminate={picked().length > 0 && !all()}
            readOnly={locked() && all()}
            disabled={locked() || picked().length > 5}
            onChange={() => setPicked(all() ? [] : toppings)}
          />
          <Checkbox label="Keep" readOnly={locked() && picked().length > 9} />
        </>
      ));
      await userEvent.click(screen.getByRole("checkbox", { name: "All toppings" }));
      expect(screen.getByRole("checkbox", { name: "All toppings" })).toBeChecked();
      await userEvent.click(screen.getByText("All toppings").closest(".bx-Checkbox")!);
      await userEvent.click(screen.getByRole("checkbox", { name: "Keep" }));
      const leaks = warn.mock.calls.filter(call =>
        String(call[0]).includes("outside a `createRoot`")
      );
      expect(leaks).toEqual([]);
    } finally {
      warn.mockRestore();
    }
  });
});
