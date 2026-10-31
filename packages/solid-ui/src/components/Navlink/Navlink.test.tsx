import { render, screen } from "@solidjs/testing-library";

import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Navlink } from "./Navlink";

describe("Navlink", () => {
  it("renders a link, marked as the current page when active", () => {
    render(() => (
      <>
        <Navlink href="/home" label="Home" active />
        <Navlink href="/about" label="About" />
      </>
    ));
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "About" })).not.toHaveAttribute("aria-current");
  });

  it("works as a keyboard-reachable button without href", async () => {
    const onClick = vi.fn();
    render(() => <Navlink label="Settings" onClick={onClick} />);
    const item = screen.getByRole("button", { name: "Settings" });
    expect(item).toHaveAttribute("tabindex", "0");
    item.focus();
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard(" ");
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it("toggles its nested links", async () => {
    render(() => (
      <Navlink label="Docs">
        <Navlink href="/docs/intro" label="Intro" />
      </Navlink>
    ));
    const parent = screen.getByRole("button", { name: "Docs" });
    expect(parent).toHaveAttribute("aria-expanded", "false");
    // Closed groups are inert, so their links are out of the tab order and the accessibility tree.
    // Solid sets the property, which jsdom doesn't reflect to the attribute as browsers do.
    const collapse = () => screen.getByText("Intro").closest<HTMLElement>(".bx-Navlink-collapse")!;
    expect(collapse().inert).toBe(true);

    await userEvent.click(parent);
    expect(parent).toHaveAttribute("aria-expanded", "true");
    expect(collapse().inert).toBe(false);

    await userEvent.click(parent);
    expect(parent).toHaveAttribute("aria-expanded", "false");
  });

  it("follows a controlled opened prop instead of toggling itself", async () => {
    render(() => (
      <Navlink label="Docs" opened>
        <Navlink href="/docs/intro" label="Intro" />
      </Navlink>
    ));
    const parent = screen.getByRole("button", { name: "Docs" });
    await userEvent.click(parent);
    expect(parent).toHaveAttribute("aria-expanded", "true");
  });

  it("ignores clicks and leaves the tab order when disabled", async () => {
    const onClick = vi.fn();
    render(() => <Navlink label="Billing" disabled onClick={onClick} />);
    const item = screen.getByRole("button", { name: "Billing" });
    expect(item).toHaveAttribute("aria-disabled", "true");
    expect(item).not.toHaveAttribute("tabindex");
    await userEvent.click(item);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("doesn't navigate while disabled", async () => {
    let navigated: boolean | undefined;
    const listener = (event: Event) => (navigated = !event.defaultPrevented);
    render(() => <Navlink href="/x" label="Reports" disabled />);
    window.addEventListener("click", listener);
    await userEvent.click(screen.getByText("Reports"));
    window.removeEventListener("click", listener);
    expect(navigated).toBe(false);
  });
});
