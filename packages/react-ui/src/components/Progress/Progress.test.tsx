import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Progress } from "./Progress";

const bar = () => document.querySelector<HTMLElement>(".bx-Progress-bar")!;

describe("Progress", () => {
  it("exposes its value and label to assistive tech", () => {
    render(<Progress value={30} max={60} label="Uploading" />);
    const progress = screen.getByRole("progressbar", { name: "Uploading" });
    expect(progress).toHaveAttribute("aria-valuenow", "30");
    expect(progress).toHaveAttribute("aria-valuemin", "0");
    expect(progress).toHaveAttribute("aria-valuemax", "60");
    expect(bar().style.width).toBe("50%");
  });

  it("draws the label a second time for the filled part, hidden from assistive tech", () => {
    render(<Progress value={30} max={60} label="Uploading" />);
    const [label, filled] = document.querySelectorAll<HTMLElement>(".bx-Progress-label");
    expect(label).not.toHaveAttribute("aria-hidden");
    expect(filled).toHaveAttribute("aria-hidden", "true");
    expect(filled).toHaveAttribute("data-filled");
    // The filled copy is clipped to this width in CSS.
    expect(screen.getByRole("progressbar").style.getPropertyValue("--bx-progress-percent")).toBe(
      "50%"
    );
  });

  it("keeps aria-valuenow within 0 and max", () => {
    render(<Progress value={150} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
  });

  it("keeps the bar within 0–100%", () => {
    const { unmount } = render(<Progress value={150} />);
    expect(bar().style.width).toBe("100%");
    unmount();
    render(<Progress value={-10} />);
    expect(bar().style.width).toBe("0%");
  });
});
