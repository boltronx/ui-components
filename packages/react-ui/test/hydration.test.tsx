// Hydration: the browser takes over HTML rendered on the server. Any difference between the
// server render and the first client render (ids, values, attributes) is a hydration error, which
// React reports through onRecoverableError and console.error, then patches by re-rendering.
import { act } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";

import { screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { KitchenSink } from "./fixtures/kitchen-sink";

let unmount: (() => void) | undefined;

afterEach(() => {
  act(() => unmount?.());
  unmount = undefined;
  document.body.innerHTML = "";
  localStorage.clear();
});

/** Server-renders the tree, puts the HTML on the page and hydrates it, collecting any errors. */
async function hydrate(schemeKey?: string) {
  // renderToString only runs the render phase, as on the server: no effects, so nothing reads
  // jsdom's window or storage while the HTML is made.
  const html = renderToString(<KitchenSink schemeKey={schemeKey} />);
  const container = document.createElement("div");
  container.innerHTML = html;
  document.body.appendChild(container);

  const errors: unknown[] = [];
  const consoleError = vi.spyOn(console, "error").mockImplementation((...args) => {
    errors.push(args);
  });
  try {
    await act(async () => {
      const root = hydrateRoot(container, <KitchenSink schemeKey={schemeKey} />, {
        onRecoverableError: error => errors.push(error)
      });
      unmount = () => root.unmount();
    });
  } finally {
    consoleError.mockRestore();
  }
  return { container, errors };
}

describe("hydration", () => {
  it("matches the server HTML exactly", async () => {
    const { errors } = await hydrate();
    expect(errors).toEqual([]);
  });

  it("keeps the server's ids, so labels stay linked to their fields", async () => {
    const { container } = await hydrate();
    // "Name*": the field is required.
    const input = screen.getByLabelText(/^Name/, { selector: "input" });
    expect(container).toContainElement(input);
    expect(input).toHaveValue("Ada");
    expect(input).toHaveAccessibleDescription("As on your ID");
  });

  it("is interactive once hydrated", async () => {
    await hydrate();
    await userEvent.click(screen.getByRole("combobox", { name: "Fruit" }));
    await userEvent.click(await screen.findByRole("option", { name: /^Banana/ }));
    expect(screen.getByRole("combobox", { name: "Fruit" })).toHaveTextContent("Banana");
  });

  it("switches to the saved color scheme after hydrating, without a mismatch", async () => {
    // A key of its own: each key's state is read from storage once per page, on first use.
    localStorage.setItem("hydration-scheme", "dark");
    const { errors } = await hydrate("hydration-scheme");
    expect(errors).toEqual([]);
    expect(screen.getByText(/Theme:/)).toHaveTextContent("Theme: dark");
  });
});
