import { render, screen, waitFor } from "@solidjs/testing-library";

import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Button } from "../Button/Button";
import { Modal, modal } from "../Modal/Modal";

import { Menu, MenuDropdown, MenuItem, MenuTarget } from "./Menu";

describe("Menu", () => {
  it("opens from its target and closes after an item is picked", async () => {
    const onEdit = vi.fn();
    render(() => (
      <Menu>
        <MenuTarget>
          <Button>Actions</Button>
        </MenuTarget>
        <MenuDropdown>
          <MenuItem onClick={onEdit}>Edit</MenuItem>
          <MenuItem disabled>Archive</MenuItem>
        </MenuDropdown>
      </Menu>
    ));
    expect(screen.queryByRole("menuitem")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Actions" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Edit" }));
    expect(onEdit).toHaveBeenCalledOnce();
    await waitFor(() => expect(screen.queryByRole("menuitem")).toBeNull());
  });

  it("closes on Escape", async () => {
    render(() => (
      <Menu>
        <MenuTarget>
          <Button>Actions</Button>
        </MenuTarget>
        <MenuDropdown>
          <MenuItem>Edit</MenuItem>
        </MenuDropdown>
      </Menu>
    ));
    await userEvent.click(screen.getByRole("button", { name: "Actions" }));
    await screen.findByRole("menuitem");
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("menuitem")).toBeNull());
  });
});

describe("Menu focus", () => {
  function renderMenu(onDelete?: () => void) {
    render(() => (
      <>
        <Menu>
          <MenuTarget>
            <Button>Actions</Button>
          </MenuTarget>
          <MenuDropdown>
            <MenuItem onClick={onDelete}>Delete</MenuItem>
            <MenuItem>Archive</MenuItem>
          </MenuDropdown>
        </Menu>
        <Button>After</Button>
      </>
    ));
    return screen.getByRole("button", { name: "Actions" });
  }

  it("moves focus to the first item once the dropdown is shown", async () => {
    const trigger = renderMenu();
    trigger.focus();
    await userEvent.keyboard("{Enter}");
    // The test setup refuses focus inside `visibility: hidden`, as browsers do, so this only
    // passes if focus moves after the panel is placed and shown.
    await waitFor(() => expect(screen.getByRole("menuitem", { name: "Delete" })).toHaveFocus());
  });

  it("lets Tab move on past the trigger instead of trapping it there", async () => {
    const trigger = renderMenu();
    trigger.focus();
    await userEvent.keyboard("{Enter}");
    await waitFor(() => expect(screen.getByRole("menuitem", { name: "Delete" })).toHaveFocus());
    await userEvent.tab();
    expect(screen.getByRole("button", { name: "After" })).toHaveFocus();
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("returns focus to the trigger after a modal opened from an item closes", async () => {
    const trigger = renderMenu(() => {
      void modal.open({
        content: ctx => (
          <Modal>
            <Modal.Header title="Delete it?" {...ctx} />
          </Modal>
        )
      });
    });
    await userEvent.click(trigger);
    await userEvent.click(await screen.findByRole("menuitem", { name: "Delete" }));
    await screen.findByRole("dialog", { name: "Delete it?" });
    // Long enough for the menu's exit transition to unmount the item that was clicked.
    await new Promise(resolve => setTimeout(resolve, 250));
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(trigger).toHaveFocus();
  });

  it("lets clicks on its target reach the page's own listeners", async () => {
    const onPageClick = vi.fn();
    render(() => (
      <div onClick={onPageClick}>
        <Menu>
          <MenuTarget>
            <Button>Actions</Button>
          </MenuTarget>
          <MenuDropdown>
            <MenuItem>Edit</MenuItem>
          </MenuDropdown>
        </Menu>
      </div>
    ));
    await userEvent.click(screen.getByRole("button", { name: "Actions" }));
    expect(onPageClick).toHaveBeenCalledOnce();
    expect(await screen.findByRole("menuitem", { name: "Edit" })).toBeInTheDocument();
  });
});
