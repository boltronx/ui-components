import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Button } from "./Button";

describe("Button", () => {
  it("is type=button by default, so it never submits a form by accident", async () => {
    const onSubmit = vi.fn((event: { preventDefault: () => void }) => event.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <Button>Save</Button>
      </form>
    );
    expect(screen.getByRole("button", { name: "Save" })).toHaveAttribute("type", "button");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits its form with type=submit", async () => {
    const onSubmit = vi.fn((event: { preventDefault: () => void }) => event.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <Button type="submit">Save</Button>
      </form>
    );
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it("exposes the variant for styling", () => {
    render(<Button variant="primary">Go</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("data-variant", "primary");
  });

  it("blocks clicks while loading", async () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Save
      </Button>
    );
    const button = screen.getByRole("button", { name: /save/i });
    expect(button).toHaveAttribute("aria-disabled", "true");
    expect(button).toHaveAttribute("aria-busy", "true");
    await userEvent.click(button);
    // Enter and Space still dispatch a click on an aria-disabled button; with no handler and
    // type=button, it does nothing.
    button.focus();
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard(" ");
    expect(onClick).not.toHaveBeenCalled();
  });

  it("keeps focus while it starts loading, and doesn't submit again", async () => {
    const onSubmit = vi.fn((event: { preventDefault: () => void }) => event.preventDefault());
    const { rerender } = render(
      <form onSubmit={onSubmit}>
        <Button type="submit">Save</Button>
      </form>
    );
    const button = screen.getByRole("button", { name: /save/i });
    await userEvent.click(button);
    expect(onSubmit).toHaveBeenCalledOnce();

    rerender(
      <form onSubmit={onSubmit}>
        <Button type="submit" loading>
          Save
        </Button>
      </form>
    );
    // A disabled button would drop focus to <body> here.
    expect(button).not.toBeDisabled();
    expect(button).toHaveFocus();
    await userEvent.click(button);
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard(" ");
    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it("doesn't submit again on Enter in a field while loading", async () => {
    const onSubmit = vi.fn((event: { preventDefault: () => void }) => event.preventDefault());
    const form = (loading: boolean) => (
      <form onSubmit={onSubmit}>
        <input aria-label="Email" />
        <Button type="submit" loading={loading}>
          Subscribe
        </Button>
      </form>
    );
    const { rerender } = render(form(false));
    const email = screen.getByLabelText("Email");
    await userEvent.type(email, "ada@example.com{Enter}");
    expect(onSubmit).toHaveBeenCalledOnce();

    // A lone field would otherwise submit the form by itself (implicit submission).
    rerender(form(true));
    await userEvent.type(email, "{Enter}");
    expect(onSubmit).toHaveBeenCalledOnce();

    rerender(form(false));
    await userEvent.type(email, "{Enter}");
    expect(onSubmit).toHaveBeenCalledTimes(2);
  });

  it("keeps only one button visible and focusable while loading", () => {
    render(
      <form>
        <Button type="submit" loading>
          Save
        </Button>
      </form>
    );
    expect(screen.getAllByRole("button")).toHaveLength(1);
  });

  it("drops its popover and command targets while loading, and restores them after", () => {
    // Invoker commands aren't in React's types yet; a caller passes them untyped.
    const invoker = { commandfor: "confirm", command: "show-modal" };
    const { rerender } = render(
      <Button loading popoverTarget="help" popoverTargetAction="show" {...invoker}>
        Help
      </Button>
    );
    const button = screen.getByRole("button", { name: /help/i });
    for (const name of ["popovertarget", "popovertargetaction", "commandfor", "command"]) {
      expect(button).not.toHaveAttribute(name);
    }

    rerender(
      <Button popoverTarget="help" popoverTargetAction="show" {...invoker}>
        Help
      </Button>
    );
    expect(button).toHaveAttribute("popovertarget", "help");
    expect(button).toHaveAttribute("popovertargetaction", "show");
    expect(button).toHaveAttribute("commandfor", "confirm");
    expect(button).toHaveAttribute("command", "show-modal");
  });

  it("passes native attributes through", () => {
    render(
      <Button aria-label="Close dialog" name="action" value="close" data-testid="b">
        x
      </Button>
    );
    const button = screen.getByTestId("b");
    expect(button).toHaveAccessibleName("Close dialog");
    expect(button).toHaveAttribute("name", "action");
  });
});
