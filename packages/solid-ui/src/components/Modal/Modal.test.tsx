import { createContext, useContext } from "solid-js";
import { render, screen, waitFor } from "@solidjs/testing-library";

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
      return <span>Theme: {useContext(Theme)}</span>;
    }
    render(() => (
      <Theme.Provider value="dark">
        <ModalHost />
      </Theme.Provider>
    ));
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

  it("settles its open modals when the ModalHost unmounts", async () => {
    const { unmount } = render(() => <ModalHost />);
    const result = modal.open({
      content: () => <Modal aria-label="Orphaned">Content</Modal>
    });
    await screen.findByRole("dialog", { name: "Orphaned" });
    unmount();
    await expect(result).resolves.toBe("closeAll");
    expect(document.documentElement).not.toHaveClass("bx-scroll-locked");

    // Its Escape listener is gone with it: a modal opened afterwards closes on the first Escape.
    const next = modal.open({ content: () => <Modal aria-label="Next">Content</Modal> });
    await screen.findByRole("dialog", { name: "Next" });
    await userEvent.keyboard("{Escape}");
    await expect(next).resolves.toBe("escape");
  });

  it("stays open when onBeforeClose fails, and reports why", async () => {
    const failure = new Error("Couldn't check for unsaved changes");
    const reportError = vi.fn();
    vi.stubGlobal("reportError", reportError);
    try {
      let attempt = 0;
      let close: ((value?: string) => Promise<void>) | undefined;
      const result = modal.open({
        onBeforeClose: () => {
          attempt++;
          if (attempt <= 2) throw failure;
          return true;
        },
        content: ctx => {
          close = ctx.close;
          return <Modal aria-label="Draft">Content</Modal>;
        }
      });
      await screen.findByRole("dialog", { name: "Draft" });

      // A dismissal has no caller, so the error is reported.
      await userEvent.keyboard("{Escape}");
      await waitFor(() => expect(reportError).toHaveBeenCalledWith(failure));
      // close() hands it to its caller.
      await expect(close?.("save")).rejects.toBe(failure);
      expect(screen.getByRole("dialog", { name: "Draft" })).toBeInTheDocument();

      await close?.("save");
      await expect(result).resolves.toBe("save");
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe("modal close button", () => {
  it("reports a rejected onBeforeClose instead of leaving it unhandled, and stays open", async () => {
    const reportError = vi.fn();
    vi.stubGlobal("reportError", reportError);
    let saved = false;
    try {
      const error = new Error("Save first");
      void modal.open({
        onBeforeClose: () => (saved ? true : Promise.reject(error)),
        content: ctx => (
          <Modal>
            <Modal.Header title="Editing" {...ctx} />
          </Modal>
        )
      });
      await screen.findByRole("dialog", { name: "Editing" });
      await userEvent.click(screen.getByRole("button", { name: "Close" }));
      await waitFor(() => expect(reportError).toHaveBeenCalledWith(error));
      expect(screen.getByRole("dialog", { name: "Editing" })).toBeInTheDocument();
    } finally {
      saved = true;
      modal.closeAll();
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      vi.unstubAllGlobals();
    }
  });
});
