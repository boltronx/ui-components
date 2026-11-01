import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ScrollArea } from "./ScrollArea";

describe("ScrollArea", () => {
  it("removes its drag listeners when unmounted mid-drag", () => {
    const remove = vi.spyOn(document, "removeEventListener");
    const { container, unmount } = render(<ScrollArea height={100}>content</ScrollArea>);
    fireEvent.mouseDown(container.querySelector(".bx-ScrollArea-thumb")!);
    unmount();
    const removed = remove.mock.calls.map(([type]) => type);
    expect(removed).toContain("mousemove");
    expect(removed).toContain("mouseup");
    remove.mockRestore();
  });
});
