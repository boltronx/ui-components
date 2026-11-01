import type { JSX } from "solid-js";
import { render, screen } from "@solidjs/testing-library";

import { describe, expect, it } from "vitest";

import { Anchor } from "../Anchor/Anchor";
import { Title } from "../Title/Title";

import { Text } from "./Text";

describe("Title", () => {
  it("renders the heading level from `order` and can look like another", () => {
    render(() => (
      <Title order={2} size={4}>
        Settings
      </Title>
    ));
    const heading = screen.getByRole("heading", { level: 2, name: "Settings" });
    expect(heading).toHaveAttribute("data-order", "4");
  });
});

describe("Text", () => {
  it("renders a paragraph by default, or the given element", () => {
    render(() => (
      <>
        <Text>Block</Text>
        <Text component="span" c="dimmed" size="xs">
          Inline
        </Text>
      </>
    ));
    expect(screen.getByText("Block").tagName).toBe("P");
    const inline = screen.getByText("Inline");
    expect(inline.tagName).toBe("SPAN");
    expect(inline).toHaveAttribute("data-size", "xs");
    expect(inline.getAttribute("style")).toContain("var(--bx-text-dimmed)");
  });
});

describe("Anchor", () => {
  it("renders a link, or a custom component such as a router link", () => {
    const RouterLink = (props: { href: string; class?: string; children?: JSX.Element }) => (
      <a href={`#${props.href}`} class={props.class} data-router="">
        {props.children}
      </a>
    );
    render(() => (
      <>
        <Anchor href="https://solidjs.com">Solid</Anchor>
        <Anchor component={RouterLink} href="/docs">
          Docs
        </Anchor>
      </>
    ));
    expect(screen.getByRole("link", { name: "Solid" })).toHaveClass("bx-Anchor");
    const routed = screen.getByRole("link", { name: "Docs" });
    expect(routed).toHaveAttribute("href", "#/docs");
    expect(routed).toHaveClass("bx-Anchor");
  });
});
