// Hydration: the browser takes over HTML rendered on the server (by test/ssr-setup.tsx). Solid
// matches each element by its hydration key, so any difference between the server render and the
// first client render throws or warns.
import { sharedConfig } from "solid-js";
import { hydrate } from "solid-js/web";
import { screen } from "@solidjs/testing-library";

import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, inject, it, vi } from "vitest";

import { KitchenSink } from "./fixtures/kitchen-sink";

let dispose: (() => void) | undefined;

afterEach(() => {
  dispose?.();
  dispose = undefined;
  document.body.innerHTML = "";
  localStorage.clear();
});

/**
 * Puts the server HTML on the page, as a fresh page load would. The first event after a hydration
 * marks it done (`_$HY.done`, `sharedConfig.done`), and from then on hydrate() only renders anew,
 * replacing the server's elements; so each test starts a page of its own.
 */
function serverPage() {
  delete (globalThis as { _$HY?: unknown })._$HY;
  sharedConfig.done = false;
  new Function(inject("hydrationScript"))();
  const container = document.createElement("div");
  container.innerHTML = inject("kitchenSinkHtml");
  document.body.appendChild(container);
  return container;
}

/** Puts the server HTML on the page and hydrates it, collecting any errors and warnings. */
function hydrateKitchenSink(schemeKey?: string) {
  const container = serverPage();

  const errors: unknown[] = [];
  const error = vi.spyOn(console, "error").mockImplementation((...args) => errors.push(args));
  const warn = vi.spyOn(console, "warn").mockImplementation((...args) => errors.push(args));
  try {
    dispose = hydrate(() => <KitchenSink schemeKey={schemeKey} />, container);
  } catch (caught) {
    errors.push(caught);
  } finally {
    error.mockRestore();
    warn.mockRestore();
  }
  return { container, errors };
}

describe("hydration", () => {
  it("takes over the server HTML without a mismatch", () => {
    const { errors } = hydrateKitchenSink();
    expect(errors).toEqual([]);
  });

  it("reuses the server's elements instead of rendering new ones", () => {
    const container = serverPage();
    const serverInputs = Array.from(container.querySelectorAll("input"));
    dispose = hydrate(() => <KitchenSink />, container);
    const hydratedInputs = Array.from(container.querySelectorAll("input"));
    expect(hydratedInputs).toHaveLength(serverInputs.length);
    hydratedInputs.forEach((input, i) => expect(input).toBe(serverInputs[i]));
  });

  it("keeps the server's ids, so labels stay linked to their fields", () => {
    const { container } = hydrateKitchenSink();
    // "Name*": the field is required.
    const input = screen.getByLabelText(/^Name/, { selector: "input" });
    expect(container).toContainElement(input);
    expect(input).toHaveValue("Ada");
    expect(input).toHaveAccessibleDescription("As on your ID");
  });

  it("is interactive once hydrated", async () => {
    hydrateKitchenSink();
    await userEvent.click(screen.getByRole("combobox", { name: "Fruit" }));
    await userEvent.click(await screen.findByRole("option", { name: /^Banana/ }));
    expect(screen.getByRole("combobox", { name: "Fruit" })).toHaveTextContent("Banana");
    await userEvent.click(screen.getByRole("switch", { name: "Notifications" }));
    expect(screen.getByRole("switch", { name: "Notifications" })).toBeChecked();
  });

  it("switches to the saved color scheme after hydrating", async () => {
    // A key of its own: each key's state is read from storage once per page, on first use.
    localStorage.setItem("hydration-scheme", "dark");
    // The server rendered the light default; hydrating must match it before switching, or the
    // per-scheme element below would not be the one the server sent.
    const { container, errors } = hydrateKitchenSink("hydration-scheme");
    expect(errors).toEqual([]);
    expect(screen.getByText(/Theme:/)).toHaveTextContent("Theme: dark");
    expect(container.querySelector('[data-scheme="dark"]')).not.toBeNull();
    expect(container.querySelector('[data-scheme="light"]')).toBeNull();
  });
});
