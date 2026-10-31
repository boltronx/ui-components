import { fireEvent, screen, within } from "@solidjs/testing-library";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { message } from "./Message";

/** A message's text on screen, not the copy a live region announces. */
const shownText = (text: string) => screen.getByText(text, { selector: ".bx-Message-text" });
const queryShownText = (text: string) => screen.queryByText(text, { selector: ".bx-Message-text" });

// The container is created once and lives on document.body, outside the per-test cleanup, so
// every test waits for its own messages to leave.
describe("message", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runAllTimers();
    vi.useRealTimers();
  });

  it("announces messages in a polite live region", () => {
    message.success("Saved");
    vi.advanceTimersByTime(50);
    const status = screen.getByRole("status", { name: "Notifications" });
    expect(status).toHaveTextContent("Saved");
    expect(screen.getByRole("alert")).toHaveTextContent("");
    const item = within(screen.getByRole("region", { name: "Notifications" }))
      .getByText("Saved")
      .closest(".bx-Message-item");
    expect(item).toHaveAttribute("data-type", "success");
  });

  it("announces errors as an alert, and only there", () => {
    message.error("Payment failed");
    vi.advanceTimersByTime(50);
    expect(screen.getByRole("alert")).toHaveTextContent("Error: Payment failed");
    expect(screen.getByRole("status", { name: "Notifications" })).toHaveTextContent("");
    // The list on screen isn't a live region, so its text isn't announced a second time.
    const list = screen.getByRole("region", { name: "Notifications" });
    expect(list.closest("[aria-live], [role='status'], [role='alert'], [role='log']")).toBeNull();
  });

  it("keeps every error on screen readable, after its announcement has gone", () => {
    message.error("Payment failed", 0);
    message.error("Address invalid", 0);
    vi.advanceTimersByTime(50);
    expect(screen.getByRole("alert")).toHaveTextContent("Error: Payment failed");
    expect(screen.getByRole("alert")).toHaveTextContent("Error: Address invalid");

    vi.advanceTimersByTime(10_000);
    expect(screen.getByRole("alert")).toHaveTextContent("");
    const list = screen.getByRole("region", { name: "Notifications" });
    for (const text of ["Payment failed", "Address invalid"]) {
      const shown = within(list).getByText(text);
      expect(shown.closest("[aria-hidden]")).toBeNull();
      // Its close button says which one it closes.
      expect(
        within(shown.closest(".bx-Message-item") as HTMLElement).getByRole("button", {
          name: "Close notification",
          description: text
        })
      ).toBeInTheDocument();
    }
    for (const button of screen.getAllByRole("button", { name: "Close notification" })) {
      fireEvent.click(button);
    }
  });

  it("announces the same error twice in a row", () => {
    message.error("Retry failed");
    vi.advanceTimersByTime(50);
    message.error("Retry failed");
    vi.advanceTimersByTime(50);
    expect(within(screen.getByRole("alert")).getAllByText("Error: Retry failed")).toHaveLength(2);
  });

  it("leaves after its duration, with an exit transition first", () => {
    message.info("Heads up", 2);
    const item = shownText("Heads up").closest(".bx-Message-item")!;

    vi.advanceTimersByTime(1999);
    expect(item).not.toHaveAttribute("data-exiting");
    vi.advanceTimersByTime(1);
    expect(item).toHaveAttribute("data-exiting");
    vi.advanceTimersByTime(320);
    expect(queryShownText("Heads up")).toBeNull();
  });

  it("pauses while the pointer is over it and resumes with the time left", () => {
    message.error("Failed", 2);
    const item = shownText("Failed").closest(".bx-Message-item")!;

    vi.advanceTimersByTime(1500);
    fireEvent.pointerEnter(item);
    vi.advanceTimersByTime(10_000);
    expect(item).not.toHaveAttribute("data-exiting");

    fireEvent.pointerLeave(item);
    vi.advanceTimersByTime(499);
    expect(item).not.toHaveAttribute("data-exiting");
    vi.advanceTimersByTime(1);
    expect(item).toHaveAttribute("data-exiting");
  });

  it("pauses while focus is inside it, as it does for the pointer", () => {
    message.success("Saved", { seconds: 2, closable: true });
    const item = shownText("Saved").closest(".bx-Message-item")!;
    const close = screen.getByRole("button", { name: "Close notification" });

    vi.advanceTimersByTime(1500);
    fireEvent.focusIn(close);
    vi.advanceTimersByTime(10_000);
    expect(item).not.toHaveAttribute("data-exiting");

    // The pointer leaving doesn't restart it while focus is still inside.
    fireEvent.pointerEnter(item);
    fireEvent.pointerLeave(item);
    vi.advanceTimersByTime(10_000);
    expect(item).not.toHaveAttribute("data-exiting");

    fireEvent.focusOut(close, { relatedTarget: document.body });
    vi.advanceTimersByTime(499);
    expect(item).not.toHaveAttribute("data-exiting");
    vi.advanceTimersByTime(1);
    expect(item).toHaveAttribute("data-exiting");
  });

  it("stays with Infinity or a duration longer than a timer can hold", () => {
    const closeForever = message.info("Forever", Infinity);
    const closeMonth = message.info("A month", 30 * 24 * 60 * 60);
    const forever = shownText("Forever").closest(".bx-Message-item")!;
    const month = shownText("A month").closest(".bx-Message-item")!;
    vi.advanceTimersByTime(60_000);
    expect(forever).not.toHaveAttribute("data-exiting");
    expect(month).not.toHaveAttribute("data-exiting");
    // Infinity never leaves on its own, so it can be closed.
    expect(forever.querySelector(".bx-Message-close")).not.toBeNull();
    closeForever();
    closeMonth();
  });

  it("uses longer defaults for errors than for successes", () => {
    message.success("Done");
    message.error("Broken");
    vi.advanceTimersByTime(3000);
    expect(shownText("Done").closest(".bx-Message-item")).toHaveAttribute("data-exiting");
    expect(shownText("Broken").closest(".bx-Message-item")).not.toHaveAttribute("data-exiting");
  });

  it("shows three at a time and queues the rest, each timed from when it appears", () => {
    for (const n of [1, 2, 3, 4, 5]) message.info(`Message ${n}`, 2);
    expect(shownText("Message 3")).toBeInTheDocument();
    expect(queryShownText("Message 4")).toBeNull();

    // The first three leave together; the queued two come in as they start leaving.
    vi.advanceTimersByTime(2000);
    expect(shownText("Message 4")).toBeInTheDocument();
    expect(shownText("Message 5")).toBeInTheDocument();
    const fourth = shownText("Message 4").closest(".bx-Message-item")!;
    expect(fourth).not.toHaveAttribute("data-exiting");

    // Its own two seconds, not two seconds from when it was queued.
    vi.advanceTimersByTime(1999);
    expect(fourth).not.toHaveAttribute("data-exiting");
    vi.advanceTimersByTime(1);
    expect(fourth).toHaveAttribute("data-exiting");
  });

  it("takes a different limit from config", () => {
    message.config({ limit: 1 });
    try {
      message.success("First", 2);
      message.success("Second", 2);
      expect(queryShownText("Second")).toBeNull();
      vi.advanceTimersByTime(2000);
      expect(shownText("Second")).toBeInTheDocument();
    } finally {
      message.config({ limit: 3 });
    }
  });

  it("shows a close button when closable", () => {
    message.success("Saved", { closable: true });
    const item = shownText("Saved").closest(".bx-Message-item")!;
    fireEvent.click(screen.getByRole("button", { name: "Close notification" }));
    expect(item).toHaveAttribute("data-exiting");
  });

  it("stays until closed with 0 seconds, and is then closable", () => {
    message.warning("Connection lost", 0);
    const item = shownText("Connection lost").closest(".bx-Message-item")!;
    fireEvent.pointerEnter(item);
    fireEvent.pointerLeave(item);
    vi.advanceTimersByTime(60_000);
    expect(item).not.toHaveAttribute("data-exiting");
    fireEvent.click(screen.getByRole("button", { name: "Close notification" }));
    expect(item).toHaveAttribute("data-exiting");
  });

  it("returns a function that closes the message, or drops it from the queue", () => {
    message.config({ limit: 1 });
    try {
      const closeUploading = message.info("Uploading", 0);
      const closeQueued = message.info("Queued", 0);
      const closeNext = message.info("Next", 0);
      closeQueued();
      closeUploading();
      closeUploading();
      expect(shownText("Next")).toBeInTheDocument();
      expect(queryShownText("Queued")).toBeNull();
      closeNext();
    } finally {
      message.config({ limit: 3 });
    }
  });
});
