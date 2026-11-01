import { createSignal } from "solid-js";
import { render, waitFor } from "@solidjs/testing-library";

import { describe, expect, it, vi } from "vitest";

import { FloatingPanel } from "./FloatingPanel";

function renderPanel(options: { exitDuration?: number; onOpen?: (panel: HTMLDivElement) => void }) {
  const [open, setOpen] = createSignal(false);
  let target: HTMLButtonElement | undefined;
  render(() => (
    <>
      <button ref={element => (target = element)}>Target</button>
      <FloatingPanel
        open={open()}
        target={() => target}
        exitDuration={options.exitDuration}
        onOpen={options.onOpen}
        class="panel"
      >
        Content
      </FloatingPanel>
    </>
  ));
  const panel = () => document.querySelector<HTMLElement>(".panel");
  return { setOpen, panel };
}

describe("FloatingPanel", () => {
  it("is laid out closed and unseen first, so its opening transition can run", async () => {
    const { setOpen, panel } = renderPanel({});
    setOpen(true);
    expect(panel()).toHaveAttribute("data-open", "false");
    expect(panel()!.style.visibility).toBe("hidden");
    await waitFor(() => expect(panel()).toHaveAttribute("data-open", "true"));
    expect(panel()!.style.visibility).toBe("");
  });

  it("stays placed when reopened during its exit transition, so it never vanishes", async () => {
    const { setOpen, panel } = renderPanel({ exitDuration: 200 });
    setOpen(true);
    await waitFor(() => expect(panel()).toHaveAttribute("data-open", "true"));
    setOpen(false);
    expect(panel()).toHaveAttribute("data-open", "false");
    expect(panel()!.style.visibility).toBe("");
    setOpen(true);
    expect(panel()).toHaveAttribute("data-open", "true");
    expect(panel()!.style.visibility).toBe("");
  });

  it("calls onOpen once per opening, after the panel is shown", async () => {
    const shownWhenCalled: string[] = [];
    const onOpen = vi.fn((element: HTMLDivElement) => {
      shownWhenCalled.push(element.style.visibility);
    });
    const { setOpen, panel } = renderPanel({ onOpen });
    setOpen(true);
    await waitFor(() => expect(onOpen).toHaveBeenCalledOnce());
    expect(onOpen).toHaveBeenCalledWith(panel());

    setOpen(false);
    await waitFor(() => expect(panel()).toBeNull());
    setOpen(true);
    await waitFor(() => expect(onOpen).toHaveBeenCalledTimes(2));
    expect(shownWhenCalled).toEqual(["", ""]);
  });
});
