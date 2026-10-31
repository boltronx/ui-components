import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Button } from "../Button/Button";

import { Menu, MenuDivider, MenuDropdown, MenuItem, MenuTarget } from "./Menu";

describe("Menu", () => {
  it("doesn't open from a loading Button, by click, keyboard or arrow key", async () => {
    const onClickCapture = vi.fn();
    render(
      <Menu>
        <MenuTarget>
          <Button loading onClickCapture={onClickCapture}>
            Actions
          </Button>
        </MenuTarget>
        <MenuDropdown>
          <MenuItem>Edit</MenuItem>
        </MenuDropdown>
      </Menu>
    );
    const button = screen.getByRole("button", { name: /actions/i });
    await userEvent.click(button);
    button.focus();
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard(" ");
    await userEvent.keyboard("{ArrowDown}");
    expect(screen.queryByRole("menu")).toBeNull();
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(button).toHaveFocus();
    expect(onClickCapture).not.toHaveBeenCalled();
  });

  it("opens from its target and closes after an item is picked", async () => {
    const onEdit = vi.fn();
    render(
      <Menu>
        <MenuTarget>
          <Button>Actions</Button>
        </MenuTarget>
        <MenuDropdown>
          <MenuItem onClick={onEdit}>Edit</MenuItem>
          <MenuItem disabled>Archive</MenuItem>
        </MenuDropdown>
      </Menu>
    );
    expect(screen.queryByRole("menuitem")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Actions" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Edit" }));
    expect(onEdit).toHaveBeenCalledOnce();
    await waitFor(() => expect(screen.queryByRole("menuitem")).toBeNull());
  });

  it("closes on Escape", async () => {
    render(
      <Menu>
        <MenuTarget>
          <Button>Actions</Button>
        </MenuTarget>
        <MenuDropdown>
          <MenuItem>Edit</MenuItem>
        </MenuDropdown>
      </Menu>
    );
    await userEvent.click(screen.getByRole("button", { name: "Actions" }));
    await screen.findByRole("menuitem");
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("menuitem")).toBeNull());
  });
});

describe("Menu clicks", () => {
  const twoMenus = (
    <>
      <Menu>
        <MenuTarget>
          <Button>First</Button>
        </MenuTarget>
        <MenuDropdown>
          <MenuItem>One</MenuItem>
        </MenuDropdown>
      </Menu>
      <Menu>
        <MenuTarget>
          <Button>Second</Button>
        </MenuTarget>
        <MenuDropdown>
          <MenuItem>Two</MenuItem>
        </MenuDropdown>
      </Menu>
    </>
  );

  it("closes when another Menu opens", async () => {
    render(twoMenus);
    const first = screen.getByRole("button", { name: "First" });
    const second = screen.getByRole("button", { name: "Second" });
    await userEvent.click(first);
    expect(first).toHaveAttribute("aria-expanded", "true");
    await userEvent.click(second);
    expect(second).toHaveAttribute("aria-expanded", "true");
    expect(first).toHaveAttribute("aria-expanded", "false");
  });

  it("lets a click on its target reach the page's own listeners", async () => {
    const onDocumentClick = vi.fn();
    document.addEventListener("click", onDocumentClick);
    render(twoMenus);
    await userEvent.click(screen.getByRole("button", { name: "First" }));
    document.removeEventListener("click", onDocumentClick);
    expect(onDocumentClick).toHaveBeenCalledOnce();
  });

  it("stays open for a click inside its dropdown that isn't an item", async () => {
    render(twoMenus);
    const first = screen.getByRole("button", { name: "First" });
    await userEvent.click(first);
    await userEvent.click((await screen.findByRole("menu")).parentElement!);
    expect(first).toHaveAttribute("aria-expanded", "true");
  });

  it("keeps clicks in its dropdown from reaching the components that hold it", async () => {
    // The dropdown is portaled to <body>, but React passes events up the component tree.
    const onCardClick = vi.fn();
    const onDelete = vi.fn();
    render(
      <div onClick={onCardClick}>
        <Menu>
          <MenuTarget>
            <Button>Actions</Button>
          </MenuTarget>
          <MenuDropdown>
            <MenuItem>Edit</MenuItem>
            <MenuDivider />
            <MenuItem onClick={onDelete}>Delete</MenuItem>
          </MenuDropdown>
        </Menu>
      </div>
    );
    await userEvent.click(screen.getByRole("button", { name: "Actions" }));
    onCardClick.mockClear();
    await userEvent.click(await screen.findByRole("separator"));
    await userEvent.click(screen.getByRole("menuitem", { name: "Delete" }));
    expect(onDelete).toHaveBeenCalledOnce();
    expect(onCardClick).not.toHaveBeenCalled();
  });
});

describe("Menu opening", () => {
  const menu = (
    <Menu>
      <MenuTarget>
        <Button>Actions</Button>
      </MenuTarget>
      <MenuDropdown>
        <MenuItem>Edit</MenuItem>
        <MenuItem>Delete</MenuItem>
      </MenuDropdown>
    </Menu>
  );

  it("moves focus into the menu on every opening, not just the first", async () => {
    render(menu);
    const target = screen.getByRole("button", { name: "Actions" });
    for (let opening = 1; opening <= 3; opening++) {
      target.focus();
      await userEvent.keyboard("{Enter}");
      await waitFor(() => expect(screen.getByRole("menuitem", { name: "Edit" })).toHaveFocus());
      await userEvent.keyboard("{Escape}");
      expect(target).toHaveFocus();
      // Past the exit transition, so the next opening starts from a fully closed panel.
      await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
    }
  });

  it("is open (for its CSS) only once placed, so the opening transition runs", async () => {
    render(menu);
    fireEvent.click(screen.getByRole("button", { name: "Actions" }));
    const panel = document.querySelector<HTMLElement>(".bx-Menu-dropdown")!;
    // Laid out unseen, in its closed styles, before it is shown open.
    expect(panel).toHaveAttribute("data-open", "false");
    expect(panel.style.visibility).toBe("hidden");
    await waitFor(() => expect(panel).toHaveAttribute("data-open", "true"));
    expect(panel.style.visibility).toBe("");
  });
});
