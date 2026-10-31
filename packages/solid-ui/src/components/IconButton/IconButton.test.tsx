import { render, screen } from "@solidjs/testing-library";

import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { IconButton } from "./IconButton";

describe("IconButton", () => {
  it("uses the tooltip as its accessible name, without repeating it as the description", () => {
    render(() => <IconButton tooltip="Delete">×</IconButton>);
    const button = screen.getByRole("button", { name: "Delete" });
    expect(button).not.toHaveAttribute("aria-describedby");
    expect(screen.getByRole("tooltip")).toHaveTextContent("Delete");
  });

  it("prefers an explicit aria-label, and then the tooltip describes the button", () => {
    render(() => (
      <IconButton tooltip="Delete" aria-label="Delete row 3">
        ×
      </IconButton>
    ));
    const button = screen.getByRole("button", { name: "Delete row 3" });
    expect(button).toHaveAccessibleDescription("Delete");
  });

  it("keeps the caller's own description alongside the tooltip's", () => {
    render(() => (
      <>
        <p id="hint">Can't be undone</p>
        <IconButton tooltip="Delete" aria-label="Delete row 3" aria-describedby="hint">
          ×
        </IconButton>
        <IconButton tooltip="Archive" aria-describedby="hint">
          ×
        </IconButton>
      </>
    ));
    expect(screen.getByRole("button", { name: "Delete row 3" })).toHaveAccessibleDescription(
      "Can't be undone Delete"
    );
    expect(screen.getByRole("button", { name: "Archive" })).toHaveAccessibleDescription(
      "Can't be undone"
    );
  });

  it("defaults to type=button and passes clicks through", async () => {
    const onClick = vi.fn();
    render(() => (
      <IconButton aria-label="Close" onClick={onClick}>
        ×
      </IconButton>
    ));
    const button = screen.getByRole("button", { name: "Close" });
    expect(button).toHaveAttribute("type", "button");
    expect(screen.queryByRole("tooltip")).toBeNull();
    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("focuses itself with autoFocus", async () => {
    render(() => (
      <IconButton aria-label="Close" autoFocus>
        ×
      </IconButton>
    ));
    await Promise.resolve();
    expect(screen.getByRole("button", { name: "Close" })).toHaveFocus();
  });

  it("shows its tooltip in a portal on hover, so overflow:hidden parents can't clip it", async () => {
    render(() => (
      <div style={{ overflow: "hidden" }} data-testid="clipping-parent">
        <IconButton tooltip="Settings">×</IconButton>
      </div>
    ));
    expect(document.querySelector(".bx-IconButton-tooltip")).toBeNull();
    await userEvent.hover(screen.getByRole("button", { name: "Settings" }));
    const visible = document.querySelector(".bx-IconButton-tooltip")!;
    expect(visible).toHaveTextContent("Settings");
    expect(screen.getByTestId("clipping-parent")).not.toContainElement(visible as HTMLElement);

    await userEvent.unhover(screen.getByRole("button", { name: "Settings" }));
    expect(visible).toHaveAttribute("data-open", "false");
  });
});
