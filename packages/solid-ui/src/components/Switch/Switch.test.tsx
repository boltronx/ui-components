import { screen } from "@solidjs/testing-library";

import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { renderInForm } from "../../../test/helpers";

import { Switch } from "./Switch";

describe("Switch", () => {
  it("is announced as a switch, and styled as one", () => {
    renderInForm(() => <Switch label="Wi-Fi" />);
    const toggle = screen.getByRole("switch", { name: "Wi-Fi" });
    expect(toggle.closest(".bx-Checkbox")).toHaveClass("bx-Switch");
  });

  it("submits its value while on, like a checkbox", async () => {
    const { data } = renderInForm(() => <Switch label="Wi-Fi" name="wifi" />);
    expect(data().get("wifi")).toBeNull();
    await userEvent.click(screen.getByRole("switch"));
    expect(data().get("wifi")).toBe("on");
  });

  it("restores defaultChecked on form reset", async () => {
    const { reset } = renderInForm(() => <Switch label="Wi-Fi" defaultChecked />);
    const toggle = screen.getByRole("switch");
    await userEvent.click(toggle);
    expect(toggle).not.toBeChecked();
    await reset();
    expect(toggle).toBeChecked();
  });

  it("leaves a controlled state to the parent", async () => {
    const onChange = vi.fn();
    renderInForm(() => <Switch label="Wi-Fi" checked={false} onChange={onChange} />);
    await userEvent.click(screen.getByRole("switch"));
    await Promise.resolve();
    expect(onChange).toHaveBeenCalledOnce();
    expect(screen.getByRole("switch")).not.toBeChecked();
  });

  it("does not toggle when read-only", async () => {
    renderInForm(() => <Switch label="Wi-Fi" readOnly />);
    await userEvent.click(screen.getByRole("switch"));
    expect(screen.getByRole("switch")).not.toBeChecked();
  });
});

describe("Switch options", () => {
  it("draws its size, track labels and thumb icon, hidden from screen readers", () => {
    renderInForm(() => (
      <Switch
        label="Wi-Fi"
        size="lg"
        onLabel="ON"
        offLabel="OFF"
        thumbIcon={<svg data-testid="thumb" />}
      />
    ));
    const toggle = screen.getByRole("switch", { name: "Wi-Fi" });
    const row = toggle.closest(".bx-Switch")!;
    expect(row).toHaveAttribute("data-size", "lg");
    expect(row).toHaveAttribute("data-with-labels");
    const track = row.querySelector(".bx-Switch-track")!;
    expect(track).toHaveAttribute("aria-hidden", "true");
    expect(track).toHaveTextContent("ONOFF");
    expect(track).toContainElement(screen.getByTestId("thumb"));
  });

  it("toggles from a click on the drawn track", async () => {
    renderInForm(() => <Switch label="Wi-Fi" />);
    // In a browser the invisible input covers the track; the row's own click handling is the
    // fallback when something else (here the test) clicks the track directly.
    const toggle = screen.getByRole("switch");
    await userEvent.click(toggle.closest(".bx-Switch")!.querySelector(".bx-Switch-track")!);
    expect(toggle).toBeChecked();
  });
});
