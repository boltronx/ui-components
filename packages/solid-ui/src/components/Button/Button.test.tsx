import { createSignal } from "solid-js";
import { render, screen } from "@solidjs/testing-library";

import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Button } from "./Button";

describe("Button", () => {
  it("is type=button by default, so it never submits a form by accident", async () => {
    const onSubmit = vi.fn((event: Event) => event.preventDefault());
    render(() => (
      <form onSubmit={onSubmit}>
        <Button>Save</Button>
      </form>
    ));
    expect(screen.getByRole("button", { name: "Save" })).toHaveAttribute("type", "button");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits its form with type=submit", async () => {
    const onSubmit = vi.fn((event: Event) => event.preventDefault());
    render(() => (
      <form onSubmit={onSubmit}>
        <Button type="submit">Save</Button>
      </form>
    ));
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it("exposes the variant for styling", () => {
    render(() => <Button variant="primary">Go</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("data-variant", "primary");
  });

  it("blocks clicks while loading", async () => {
    const onClick = vi.fn();
    render(() => (
      <Button loading onClick={onClick}>
        Save
      </Button>
    ));
    const button = screen.getByRole("button", { name: /save/i });
    expect(button).toHaveAttribute("aria-disabled", "true");
    expect(button).toHaveAttribute("aria-busy", "true");
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("keeps focus when it starts loading, and doesn't submit meanwhile", async () => {
    const [loading, setLoading] = createSignal(false);
    const onClick = vi.fn(() => setLoading(true));
    const onSubmit = vi.fn((event: Event) => event.preventDefault());
    render(() => (
      <form onSubmit={onSubmit}>
        <input aria-label="Name" />
        <Button type="submit" loading={loading()} onClick={onClick}>
          Save
        </Button>
      </form>
    ));
    const button = screen.getByRole("button", { name: /save/i });
    button.focus();
    await userEvent.keyboard("{Enter}");
    expect(onClick).toHaveBeenCalledOnce();
    expect(onSubmit).toHaveBeenCalledOnce();
    // Still focused, unlike a disabled button, so the keyboard user stays in place.
    expect(button).toHaveFocus();

    await userEvent.keyboard("{Enter}");
    await userEvent.type(screen.getByLabelText("Name"), "x{Enter}");
    expect(onClick).toHaveBeenCalledOnce();
    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it("calls a bound click handler", async () => {
    const onClick = vi.fn();
    render(() => <Button onClick={[onClick, "row-3"]}>Delete</Button>);
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(onClick).toHaveBeenCalledWith("row-3", expect.any(MouseEvent));
  });

  it("passes native attributes through", () => {
    render(() => (
      <Button aria-label="Close dialog" name="action" value="close" data-testid="b">
        x
      </Button>
    ));
    const button = screen.getByTestId("b");
    expect(button).toHaveAccessibleName("Close dialog");
    expect(button).toHaveAttribute("name", "action");
  });
});
