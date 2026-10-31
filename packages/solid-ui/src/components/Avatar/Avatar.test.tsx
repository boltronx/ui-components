import { render, screen } from "@solidjs/testing-library";

import { describe, expect, it } from "vitest";

import { Avatar, getInitials } from "./Avatar";

describe("getInitials", () => {
  it("takes the first letter of the first two words, or two letters of one word", () => {
    expect(getInitials("Ada Lovelace")).toBe("AL");
    expect(getInitials("  Grace   Brewster Hopper ")).toBe("GB");
    expect(getInitials("Plato")).toBe("Pl");
    expect(getInitials("Ada Lovelace", false)).toBe("A");
    expect(getInitials("")).toBe("");
  });

  it("never cuts an emoji, a flag or a combined letter in half", () => {
    expect(getInitials("😀 Smile")).toBe("😀S");
    expect(getInitials("😀", false)).toBe("😀");
    expect(getInitials("🇵🇭 Manila")).toBe("🇵🇭M");
    expect(getInitials("👩‍💻")).toBe("👩‍💻");
    // "e" followed by a combining acute accent
    expect(getInitials("é Smith")).toBe("éS");
  });
});

describe("Avatar", () => {
  it("shows the initials and is named by the full label", () => {
    render(() => <Avatar label="Ada Lovelace" />);
    expect(screen.getByRole("img", { name: "Ada Lovelace" })).toHaveTextContent("AL");
  });

  it("takes a color, but not one that adds other declarations", () => {
    render(() => (
      <>
        <Avatar label="Ada" color="rebeccapurple" />
        <Avatar label="Eve" color="red; background-image: url(https://example.test/track)" />
      </>
    ));
    expect(screen.getByRole("img", { name: "Ada" }).style.backgroundColor).toBe("rebeccapurple");
    const eve = screen.getByRole("img", { name: "Eve" });
    expect(eve.style.backgroundColor).toBe("");
    expect(eve.style.backgroundImage).toBe("");
  });

  it("drops a color whose quoted string a newline ends early", () => {
    render(() => (
      <Avatar
        label="Eve"
        color={'"red\n; background-image: url(https://example.test/track); --tail: "'}
      />
    ));
    const eve = screen.getByRole("img", { name: "Eve" });
    expect(eve.getAttribute("style") ?? "").not.toContain("background-image");
    expect(eve.style.backgroundImage).toBe("");
  });
});
