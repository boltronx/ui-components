import { render, screen } from "@solidjs/testing-library";

import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Anchor } from "./Anchor";

describe("Anchor", () => {
  it("renders a link that underlines on hover by default", () => {
    render(() => <Anchor href="/docs">Docs</Anchor>);
    const link = screen.getByRole("link", { name: "Docs" });
    expect(link).toHaveAttribute("href", "/docs");
    expect(link).toHaveClass("bx-Anchor");
    expect(link).toHaveAttribute("data-underline", "hover");
  });

  it("renders as a button for an action that reads as a link", async () => {
    const onClick = vi.fn();
    render(() => (
      <Anchor component="button" type="button" onClick={onClick}>
        SO-1042
      </Anchor>
    ));
    const button = screen.getByRole("button", { name: "SO-1042" });
    expect(button).toHaveClass("bx-Anchor");
    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });
});
