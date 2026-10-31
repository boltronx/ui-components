import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Avatar, getInitials } from "./Avatar";

describe("getInitials", () => {
  it("takes the first letter of the first two words, or two letters of one word", () => {
    expect(getInitials("Ada Lovelace")).toBe("AL");
    expect(getInitials("  Grace   Brewster Hopper ")).toBe("GB");
    expect(getInitials("Plato")).toBe("Pl");
    expect(getInitials("Plato", false)).toBe("P");
    expect(getInitials("")).toBe("");
  });

  it("keeps characters outside the BMP whole instead of splitting their surrogate pairs", () => {
    expect(getInitials("𝒜 𝐿")).toBe("𝒜𝐿");
    expect(getInitials("𠮷田")).toBe("𠮷田");
    expect(getInitials("😀 Smile", false)).toBe("😀");
    expect(getInitials("𠮷田 太郎")).toBe("𠮷太");
  });

  it("keeps flags, joined emoji and combined letters whole", () => {
    expect(getInitials("🇵🇭 Manila")).toBe("🇵🇭M");
    expect(getInitials("👩‍💻 Dev")).toBe("👩‍💻D");
    expect(getInitials("👩‍💻", false)).toBe("👩‍💻");
    // "e" followed by a combining acute accent
    expect(getInitials("é Smith")).toBe("éS");
  });
});

describe("Avatar", () => {
  it("shows initials and is named by the full label", () => {
    render(<Avatar label="Ada Lovelace" />);
    expect(screen.getByRole("img", { name: "Ada Lovelace" })).toHaveTextContent("AL");
  });
});
