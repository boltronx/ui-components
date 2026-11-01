import type { ReactNode } from "react";

import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Anchor } from "./Anchor";

describe("Anchor", () => {
  it("renders a link that underlines on hover by default", () => {
    render(<Anchor href="/docs">Docs</Anchor>);
    const link = screen.getByRole("link", { name: "Docs" });
    expect(link).toHaveAttribute("href", "/docs");
    expect(link).toHaveClass("bx-Anchor");
    expect(link).toHaveAttribute("data-underline", "hover");
  });

  it("renders as a button for an action that reads as a link", async () => {
    const onClick = vi.fn();
    render(
      <Anchor component="button" type="button" onClick={onClick}>
        SO-1042
      </Anchor>
    );
    const button = screen.getByRole("button", { name: "SO-1042" });
    expect(button).toHaveClass("bx-Anchor");
    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("renders a router's link component, passing href through", () => {
    function RouterLink(props: { href?: string; className?: string; children?: ReactNode }) {
      return (
        <a data-router="" href={props.href} className={props.className}>
          {props.children}
        </a>
      );
    }
    render(
      <Anchor component={RouterLink} href="/orders" underline="always">
        Orders
      </Anchor>
    );
    const link = screen.getByRole("link", { name: "Orders" });
    expect(link).toHaveAttribute("data-router");
    expect(link).toHaveClass("bx-Anchor");
  });
});
