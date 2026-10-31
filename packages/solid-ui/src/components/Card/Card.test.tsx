import { render, screen } from "@solidjs/testing-library";

import { describe, expect, it } from "vitest";

import { Card } from "./Card";

describe("Card", () => {
  it("pads itself by default, but a style prop wins", () => {
    render(() => (
      <>
        <Card>a</Card>
        <Card style={{ padding: "0px" }}>b</Card>
      </>
    ));
    expect(screen.getByText("a").style.padding).toBe("var(--bx-spacing-md)");
    expect(screen.getByText("b").style.padding).toBe("0px");
  });
});
