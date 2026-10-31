import { render, screen } from "@solidjs/testing-library";

import { describe, expect, it } from "vitest";

import { Flex } from "./Flex";

const flex = () => screen.getByTestId("flex");

describe("Flex", () => {
  it("lays out a row by default, with its spacing and alignment inline", () => {
    render(() => (
      <Flex
        data-testid="flex"
        gap="md"
        rowGap={4}
        justify="space-between"
        align="center"
        wrap="wrap"
      >
        <span>a</span>
      </Flex>
    ));
    expect(flex()).toHaveClass("bx-Flex");
    expect(flex().style.getPropertyValue("--bx-flex-direction")).toBe("row");
    expect(flex().style.gap).toBe("var(--bx-spacing-md)");
    expect(flex().style.rowGap).toBe("4px");
    expect(flex().style.justifyContent).toBe("space-between");
    expect(flex().style.alignItems).toBe("center");
    expect(flex().style.flexWrap).toBe("wrap");
  });

  it("takes a fixed direction", () => {
    render(() => <Flex data-testid="flex" direction="column-reverse" />);
    expect(flex().style.getPropertyValue("--bx-flex-direction")).toBe("column-reverse");
    expect(flex()).not.toHaveAttribute("data-direction-sm");
  });

  it("hands each breakpoint's direction to the stylesheet's media queries", () => {
    render(() => <Flex data-testid="flex" direction={{ base: "column", md: "row" }} />);
    expect(flex().style.getPropertyValue("--bx-flex-direction")).toBe("column");
    expect(flex().style.getPropertyValue("--bx-flex-direction-md")).toBe("row");
    expect(flex()).toHaveAttribute("data-direction-md");
    expect(flex()).not.toHaveAttribute("data-direction-sm");
  });

  it("sets its own direction rather than inheriting a parent Flex's", () => {
    render(() => (
      <Flex direction="column">
        <Flex data-testid="flex" direction={{ md: "column" }} />
      </Flex>
    ));
    expect(flex().style.getPropertyValue("--bx-flex-direction")).toBe("row");
  });

  it("renders the given element and passes attributes through", () => {
    render(() => (
      <Flex component="ul" aria-label="Tags" inline class="mine" style={{ color: "red" }}>
        <li>One</li>
      </Flex>
    ));
    const list = screen.getByRole("list", { name: "Tags" });
    expect(list).toHaveClass("bx-Flex", "mine");
    expect(list).toHaveAttribute("data-inline");
    expect(list.style.color).toBe("red");
  });
});
