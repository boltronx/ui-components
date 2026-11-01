import { createContext, use } from "react";

import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Button } from "../Button/Button";

import { Modal, modal, ModalHost } from "./Modal";

describe("modal", () => {
  it("resolves with the value passed to close", async () => {
    const result = modal.open<"ok">({
      content: ctx => (
        <Modal>
          <Modal.Header title="Delete item?" {...ctx} />
          <Modal.Body>This cannot be undone.</Modal.Body>
          <Modal.Footer>
            <Button onClick={() => ctx.close("ok")}>Delete</Button>
          </Modal.Footer>
        </Modal>
      )
    });
    const dialog = await screen.findByRole("dialog", { name: "Delete item?" });
    expect(document.documentElement).toHaveClass("bx-scroll-locked");
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    await expect(result).resolves.toBe("ok");
    expect(dialog).not.toBeInTheDocument();
    await waitFor(() => expect(document.documentElement).not.toHaveClass("bx-scroll-locked"));
  });

  it("closes on Escape unless locked", async () => {
    let lock: ((locked: boolean) => void) | undefined;
    const result = modal.open({
      content: ctx => {
        lock = ctx.lock;
        return (
          <Modal>
            <Modal.Header title="Editing" {...ctx} />
          </Modal>
        );
      }
    });
    await screen.findByRole("dialog");
    lock?.(true);
    await userEvent.keyboard("{Escape}");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    lock?.(false);
    await userEvent.keyboard("{Escape}");
    await expect(result).resolves.toBe("escape");
  });

  it("asks onBeforeClose once, however many times it is dismissed meanwhile", async () => {
    let asked = 0;
    let answer: ((proceed: boolean) => void) | undefined;
    const result = modal.open({
      onBeforeClose: () => {
        asked++;
        return new Promise<boolean>(resolve => (answer = resolve));
      },
      content: ctx => (
        <Modal>
          <Modal.Header title="Unsaved changes" {...ctx} />
        </Modal>
      )
    });
    await screen.findByRole("dialog");
    await userEvent.keyboard("{Escape}");
    await userEvent.keyboard("{Escape}");
    expect(asked).toBe(1);
    answer?.(true);
    await expect(result).resolves.toBe("escape");
  });

  it("sees the app's context when rendered through a ModalHost", async () => {
    const Theme = createContext("default");
    function ThemeName() {
      return <span>Theme: {use(Theme)}</span>;
    }
    render(
      <Theme value="dark">
        <ModalHost />
      </Theme>
    );
    const result = modal.open({
      content: ctx => (
        <Modal aria-label="Themed">
          <ThemeName />
          <Button onClick={() => ctx.close("ok")}>OK</Button>
        </Modal>
      )
    });
    expect(await screen.findByText("Theme: dark")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "OK" }));
    await expect(result).resolves.toBe("ok");
  });

  it("settles its open modals and unlocks the page when the ModalHost unmounts", async () => {
    const { unmount } = render(<ModalHost />);
    const result = modal.open({
      content: () => <Modal aria-label="Orphaned">Content</Modal>
    });
    await screen.findByRole("dialog", { name: "Orphaned" });
    expect(document.documentElement).toHaveClass("bx-scroll-locked");

    unmount();
    await expect(result).resolves.toBe("closeAll");
    expect(document.documentElement).not.toHaveClass("bx-scroll-locked");

    // Its Escape listener went with it: a modal opened afterwards closes on the first Escape.
    const next = modal.open({ content: () => <Modal aria-label="Next">Content</Modal> });
    await screen.findByRole("dialog", { name: "Next" });
    await userEvent.keyboard("{Escape}");
    await expect(next).resolves.toBe("escape");
  });

  it("settles a modal still leaving when the ModalHost unmounts, and drops its content", async () => {
    const Theme = createContext<string | null>(null);
    function Themed() {
      const theme = use(Theme);
      if (!theme) throw new Error("No theme provider");
      return <p>{theme}</p>;
    }
    const { unmount } = render(
      <Theme value="dark">
        <ModalHost />
      </Theme>
    );
    let close!: (value?: string) => Promise<void>;
    const result = modal.open({
      content: ctx => {
        close = ctx.close;
        return (
          <Modal aria-label="Leaving">
            <Themed />
          </Modal>
        );
      }
    });
    await screen.findByRole("dialog", { name: "Leaving" });

    // Mid exit animation: the item is still in the list, its removal still pending.
    await close("ok");
    unmount();
    await expect(result).resolves.toBe("ok");

    // A modal opened now renders in the store's own root, without the provider: the old content
    // must not come back there, nor its callbacks run later.
    const next = modal.open({ content: () => <Modal aria-label="Next">Content</Modal> });
    await screen.findByRole("dialog", { name: "Next" });
    expect(screen.queryByRole("dialog", { name: "Leaving" })).toBeNull();
    await new Promise(resolve => setTimeout(resolve, 300));
    expect(screen.getByRole("dialog", { name: "Next" })).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    await expect(next).resolves.toBe("escape");
  });

  it("keeps the page locked while a ModalHost takes over an open modal", async () => {
    const result = modal.open({ content: () => <Modal aria-label="Handed over">Content</Modal> });
    await screen.findByRole("dialog", { name: "Handed over" });
    expect(document.documentElement).toHaveClass("bx-scroll-locked");

    const { unmount } = render(<ModalHost />);
    // The fallback root lets go, the host's copy shows it: still one open modal, still locked.
    await waitFor(() =>
      expect(screen.getAllByRole("dialog", { name: "Handed over" })).toHaveLength(1)
    );
    expect(document.documentElement).toHaveClass("bx-scroll-locked");

    unmount();
    await expect(result).resolves.toBe("closeAll");
    await waitFor(() => expect(document.documentElement).not.toHaveClass("bx-scroll-locked"));
  });

  it("returns focus to the opener, but leaves focus the app moved elsewhere", async () => {
    render(
      <>
        <Button>Opener</Button>
        <input aria-label="Elsewhere" />
      </>
    );
    const opener = screen.getByRole("button", { name: "Opener" });
    opener.focus();
    let close: ((value?: string) => Promise<void>) | undefined;
    const first = modal.open({
      content: ctx => {
        close = ctx.close;
        return <Modal aria-label="First">Content</Modal>;
      }
    });
    await waitFor(() => expect(screen.getByRole("dialog", { name: "First" })).toHaveFocus());
    await close?.("done");
    await first;
    expect(opener).toHaveFocus();

    const second = modal.open({
      content: ctx => {
        close = ctx.close;
        return <Modal aria-label="Second">Content</Modal>;
      }
    });
    await screen.findByRole("dialog", { name: "Second" });
    // The app moves focus out of the modal while it closes, e.g. to a field with an error.
    screen.getByLabelText("Elsewhere").focus();
    await close?.("done");
    await second;
    expect(screen.getByLabelText("Elsewhere")).toHaveFocus();
  });
});

describe("modal onBeforeClose errors", () => {
  it("keeps the modal open and logs the error, instead of an unhandled rejection", async () => {
    const error = new Error("save check failed");
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    let calls = 0;
    const result = modal.open({
      onBeforeClose: () => {
        calls++;
        if (calls === 1) throw error;
        return true;
      },
      content: ctx => (
        <Modal>
          <Modal.Header title="Editing" {...ctx} />
        </Modal>
      )
    });
    await screen.findByRole("dialog");
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(logged).toHaveBeenCalledWith(error));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    logged.mockRestore();

    // A later dismissal asks again and can close it.
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    await expect(result).resolves.toBe("close");
  });
});
