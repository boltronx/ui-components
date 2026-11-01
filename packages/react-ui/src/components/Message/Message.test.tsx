import { useEffect } from "react";

import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { message } from "./Message";

/** Calls the message API inside act(), so React has rendered the change when it returns. */
function inAct<T>(fn: () => T): T {
  let result!: T;
  act(() => {
    result = fn();
  });
  return result;
}

/** Moves the fake clock; the timers it fires update the message list, so inside act(). */
const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));

// The container is created once and lives on document.body, outside the per-test cleanup, so
// every test waits for its own messages to leave.
describe("message", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    act(() => vi.runAllTimers());
    vi.useRealTimers();
  });

  it("announces messages in a polite live region, apart from the list", () => {
    inAct(() => message.success("Saved"));
    const list = screen.getByRole("region", { name: "Notifications" });
    expect(list).not.toHaveAttribute("aria-live");
    expect(screen.getByText("Saved").closest(".bx-Message-item")).toHaveAttribute(
      "data-type",
      "success"
    );
    advance(50);
    expect(screen.getByRole("status")).toHaveTextContent("Success: Saved");
    expect(screen.getByRole("alert")).toBeEmptyDOMElement();
  });

  it("leaves after its duration, with an exit transition first", () => {
    inAct(() => message.info("Heads up", 2));
    const item = screen.getByText("Heads up").closest(".bx-Message-item")!;

    advance(1999);
    expect(item).not.toHaveAttribute("data-exiting");
    advance(1);
    expect(item).toHaveAttribute("data-exiting");
    advance(320);
    expect(screen.queryByText("Heads up")).toBeNull();
  });

  it("pauses while the pointer is over it and resumes with the time left", () => {
    inAct(() => message.error("Failed", 2));
    const item = screen.getByText("Failed").closest(".bx-Message-item")!;

    advance(1500);
    fireEvent.pointerEnter(item);
    advance(10_000);
    expect(item).not.toHaveAttribute("data-exiting");

    fireEvent.pointerLeave(item);
    advance(499);
    expect(item).not.toHaveAttribute("data-exiting");
    advance(1);
    expect(item).toHaveAttribute("data-exiting");
  });

  it("uses longer defaults for errors than for successes", () => {
    inAct(() => {
      message.success("Done");
      message.error("Broken");
    });
    advance(3000);
    expect(screen.getByText("Done").closest(".bx-Message-item")).toHaveAttribute("data-exiting");
    expect(screen.getByText("Broken").closest(".bx-Message-item")).not.toHaveAttribute(
      "data-exiting"
    );
  });

  it("shows three at a time and queues the rest, each timed from when it appears", () => {
    inAct(() => {
      for (const n of [1, 2, 3, 4, 5]) message.info(`Message ${n}`, 2);
    });
    expect(screen.getByText("Message 3")).toBeInTheDocument();
    expect(screen.queryByText("Message 4")).toBeNull();

    // The first three leave together; the queued two come in as they start leaving.
    advance(2000);
    expect(screen.getByText("Message 4")).toBeInTheDocument();
    expect(screen.getByText("Message 5")).toBeInTheDocument();
    const fourth = screen.getByText("Message 4").closest(".bx-Message-item")!;
    expect(fourth).not.toHaveAttribute("data-exiting");

    // Its own two seconds, not two seconds from when it was queued.
    advance(1999);
    expect(fourth).not.toHaveAttribute("data-exiting");
    advance(1);
    expect(fourth).toHaveAttribute("data-exiting");
  });

  it("takes a different limit from config", () => {
    message.config({ limit: 1 });
    try {
      inAct(() => {
        message.success("First", 2);
        message.success("Second", 2);
      });
      expect(screen.queryByText("Second")).toBeNull();
      advance(2000);
      expect(screen.getByText("Second")).toBeInTheDocument();
    } finally {
      message.config({ limit: 3 });
    }
  });

  it("keeps its limit when config is given NaN", () => {
    message.config({ limit: NaN });
    try {
      inAct(() => message.success("Still shown", 2));
      expect(screen.getByText("Still shown")).toBeInTheDocument();
    } finally {
      message.config({ limit: 3 });
    }
  });

  it("announces errors as an alert, read once", () => {
    inAct(() => message.error("Payment failed"));
    advance(50);
    expect(screen.getByRole("alert")).toHaveTextContent("Error: Payment failed");
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("keeps every visible error in the accessibility tree", () => {
    inAct(() => {
      message.error("First failed", 0);
      message.error("Second failed", 0);
    });
    advance(50);
    const list = screen.getByRole("region", { name: "Notifications" });
    expect(within(list).getByText("First failed")).toBeVisible();
    expect(within(list).getByText("First failed").closest("[aria-hidden]")).toBeNull();
    expect(within(list).getByText("Second failed").closest("[aria-hidden]")).toBeNull();
    expect(screen.getByRole("alert")).toHaveTextContent("Error: First failedError: Second failed");
    // Not atomic, so a second announcement reads only itself, not the first again.
    expect(screen.getByRole("alert")).toHaveAttribute("aria-atomic", "false");
    expect(screen.getByRole("status")).toHaveAttribute("aria-atomic", "false");
    // The hidden copies go once read, so browsing finds each error once, in the list.
    advance(5000);
    expect(screen.getByRole("alert")).toBeEmptyDOMElement();
    for (const close of screen.getAllByRole("button", { name: "Close notification" })) {
      fireEvent.click(close);
    }
  });

  it("shows a close button when closable", () => {
    inAct(() => message.success("Saved", { closable: true }));
    const item = screen.getByText("Saved").closest(".bx-Message-item")!;
    fireEvent.click(screen.getByRole("button", { name: "Close notification" }));
    expect(item).toHaveAttribute("data-exiting");
  });

  it("stays until closed with 0 seconds, and is then closable", () => {
    inAct(() => message.warning("Connection lost", 0));
    const item = screen.getByText("Connection lost").closest(".bx-Message-item")!;
    fireEvent.pointerEnter(item);
    fireEvent.pointerLeave(item);
    advance(60_000);
    expect(item).not.toHaveAttribute("data-exiting");
    fireEvent.click(screen.getByRole("button", { name: "Close notification" }));
    expect(item).toHaveAttribute("data-exiting");
  });

  it("stays with Infinity or a duration longer than a timer can hold", () => {
    const [closeForever, closeMonth] = inAct(() => [
      message.info("Forever", Infinity),
      message.info("A month", 30 * 24 * 60 * 60)
    ]);
    const forever = screen.getByText("Forever").closest(".bx-Message-item")!;
    const month = screen.getByText("A month").closest(".bx-Message-item")!;
    advance(60_000);
    expect(forever).not.toHaveAttribute("data-exiting");
    expect(month).not.toHaveAttribute("data-exiting");
    // Infinity never leaves on its own, so it can be closed.
    expect(forever.querySelector(".bx-Message-close")).not.toBeNull();
    inAct(() => {
      closeForever();
      closeMonth();
    });
  });

  it("returns a function that closes the message, or drops it from the queue", () => {
    message.config({ limit: 1 });
    try {
      const [closeUploading, closeQueued, closeNext] = inAct(() => [
        message.info("Uploading", 0),
        message.info("Queued", 0),
        message.info("Next", 0)
      ]);
      inAct(() => {
        closeQueued();
        closeUploading();
        closeUploading();
      });
      expect(screen.getByText("Next")).toBeInTheDocument();
      expect(screen.queryByText("Queued")).toBeNull();
      inAct(closeNext);
    } finally {
      message.config({ limit: 3 });
    }
  });
});

describe("message held by focus", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    act(() => vi.runAllTimers());
    vi.useRealTimers();
  });

  it("stays while its close button has focus, even after the pointer leaves", () => {
    inAct(() => message.warning("Quota low", { seconds: 2, closable: true }));
    const item = screen.getByText("Quota low").closest(".bx-Message-item")!;
    const close = item.querySelector<HTMLButtonElement>(".bx-Message-close")!;

    advance(1500);
    act(() => close.focus());
    // Pointer in and out while focused: focus still holds it.
    fireEvent.pointerEnter(item);
    fireEvent.pointerLeave(item);
    advance(10_000);
    expect(item).not.toHaveAttribute("data-exiting");

    act(() => close.blur());
    advance(499);
    expect(item).not.toHaveAttribute("data-exiting");
    advance(1);
    expect(item).toHaveAttribute("data-exiting");
  });
});

describe("message from an effect", () => {
  it("shows a message called from useEffect, without React errors", async () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      function Loaded() {
        useEffect(() => {
          const close = message.success("Data loaded", 0);
          return close;
        }, []);
        return null;
      }
      const { unmount } = render(<Loaded />);
      expect(await screen.findByText("Data loaded")).toBeInTheDocument();
      // flushSync from an effect would log "flushSync was called from inside a lifecycle method".
      expect(errors).not.toHaveBeenCalled();
      unmount();
    } finally {
      errors.mockRestore();
    }
  });
});
