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

  it("keeps skin tones, tag flags and boxed digits whole", () => {
    expect(getInitials("👍🏽 Thumbs")).toBe("👍🏽T");
    expect(getInitials("🏴󠁧󠁢󠁥󠁮󠁧󠁿 England")).toBe("🏴󠁧󠁢󠁥󠁮󠁧󠁿E");
    expect(getInitials("1️⃣ One")).toBe("1️⃣O");
  });

  it("gives the same initials where Intl.Segmenter is missing, as in Firefox before 125", () => {
    const names = ["🇵🇭 Manila", "👩‍💻 Dev", "👍🏽 Thumbs", "𠮷田 太郎"];
    const before = names.map(name => getInitials(name));
    const original = Intl.Segmenter;
    Object.defineProperty(Intl, "Segmenter", { value: undefined, configurable: true });
    try {
      expect(names.map(name => getInitials(name))).toEqual(before);
    } finally {
      Object.defineProperty(Intl, "Segmenter", { value: original, configurable: true });
    }
  });
});

describe("Avatar", () => {
  it("shows initials and is named by the full label", () => {
    render(<Avatar label="Ada Lovelace" />);
    expect(screen.getByRole("img", { name: "Ada Lovelace" })).toHaveTextContent("AL");
  });
});
