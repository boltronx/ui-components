import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { MenuItem } from "../Menu/Menu";

import { SplitButton } from "./SplitButton";

describe("SplitButton", () => {
  it("runs the main action without opening the menu", async () => {
    const onClick = vi.fn();
    render(
      <SplitButton onClick={onClick} dropdown={<MenuItem>Save as draft</MenuItem>}>
        Save
      </SplitButton>
    );
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onClick).toHaveBeenCalledOnce();
    expect(screen.queryByRole("menuitem")).toBeNull();
  });

  it("leaves the arrow keys on the main half alone", async () => {
    render(<SplitButton dropdown={<MenuItem>Save as draft</MenuItem>}>Save</SplitButton>);
    screen.getByRole("button", { name: "Save" }).focus();
    await userEvent.keyboard("{ArrowDown}");
    await userEvent.keyboard("{ArrowUp}");
    expect(screen.queryByRole("menu")).toBeNull();
    expect(screen.getByRole("button", { name: "More options" })).toHaveAttribute(
      "aria-expanded",
      "false"
    );
  });

  it("opens the menu from the arrow half", async () => {
    const onDraft = vi.fn();
    render(
      <SplitButton dropdown={<MenuItem onClick={onDraft}>Save as draft</MenuItem>}>
        Save
      </SplitButton>
    );
    const toggle = screen.getByRole("button", { name: "More options" });
    const main = screen.getByRole("button", { name: "Save" });
    expect(toggle).toHaveAttribute("aria-haspopup", "menu");
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    // The main half is a plain button, not announced as a menu button.
    expect(main).not.toHaveAttribute("aria-haspopup");
    expect(main).not.toHaveAttribute("aria-expanded");
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    await userEvent.click(await screen.findByRole("menuitem", { name: "Save as draft" }));
    expect(onDraft).toHaveBeenCalledOnce();
    // Focus goes back to the half that opened the menu.
    expect(toggle).toHaveFocus();
  });

  it("blocks both halves while disabled", async () => {
    const onClick = vi.fn();
    render(
      <SplitButton disabled onClick={onClick} toggleAriaLabel="Other saves">
        Save
      </SplitButton>
    );
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Other saves" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("defaults to type=button so it never submits a form by accident", () => {
    render(<SplitButton>Save</SplitButton>);
    expect(screen.getByRole("button", { name: "Save" })).toHaveAttribute("type", "button");
  });
});

describe("SplitButton with its menu open", () => {
  it("closes the menu when the main half is clicked, and runs the main action", async () => {
    const onClick = vi.fn();
    render(
      <SplitButton
        onClick={onClick}
        toggleAriaLabel="Other saves"
        dropdown={<MenuItem>Draft</MenuItem>}
      >
        Save
      </SplitButton>
    );
    const toggle = screen.getByRole("button", { name: "Other saves" });
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onClick).toHaveBeenCalledOnce();
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });
});
