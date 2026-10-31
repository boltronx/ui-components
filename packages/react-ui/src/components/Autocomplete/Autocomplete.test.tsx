import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { renderInForm } from "../../../test/helpers";
import { ReadOnlyProvider } from "../ReadOnly/ReadOnly";

import { Autocomplete } from "./Autocomplete";

const cities = [
  { value: "mnl", label: "Manila" },
  { value: "ceb", label: "Cebu" },
  { value: "dvo", label: "Davao" }
];

describe("Autocomplete", () => {
  it("filters suggestions as you type and fills in the picked one", async () => {
    const onOptionSubmit = vi.fn();
    const { data } = renderInForm(
      <Autocomplete label="City" name="city" options={cities} onOptionSubmit={onOptionSubmit} />
    );
    await userEvent.type(screen.getByLabelText("City"), "ce");
    // The panel stays hidden until it is positioned on the next animation frame.
    const cebu = await screen.findByRole("option", { name: "Cebu" });
    expect(screen.queryByRole("option", { name: "Manila" })).toBeNull();
    await userEvent.click(cebu);
    expect(onOptionSubmit).toHaveBeenCalledWith(cities[1]);
    expect(data().get("city")).toBe("Cebu");
  });

  it("accepts free text and resets to defaultValue", async () => {
    const { data, reset } = renderInForm(
      <Autocomplete label="City" name="city" options={cities} defaultValue="Davao" />
    );
    const input = screen.getByLabelText("City");
    await userEvent.clear(input);
    await userEvent.type(input, "Iloilo");
    expect(data().get("city")).toBe("Iloilo");
    await reset();
    expect(input).toHaveValue("Davao");
  });

  it("keeps typed text on Enter until a suggestion is picked with the arrows", async () => {
    const { data } = renderInForm(<Autocomplete label="City" name="city" options={cities} />);
    const input = screen.getByLabelText("City");
    await userEvent.type(input, "ce");
    await screen.findByRole("option", { name: "Cebu" });
    expect(input).not.toHaveAttribute("aria-activedescendant");
    await userEvent.keyboard("{Enter}");
    expect(data().get("city")).toBe("ce");
    await userEvent.keyboard("{ArrowDown}{Enter}");
    expect(data().get("city")).toBe("Cebu");
  });

  it("doesn't open or pick inside a ReadOnlyProvider", async () => {
    const { data } = renderInForm(
      <ReadOnlyProvider readOnly>
        <Autocomplete label="City" name="city" options={cities} />
      </ReadOnlyProvider>
    );
    await userEvent.click(screen.getByLabelText("City"));
    await userEvent.keyboard("{ArrowDown}{Enter}");
    expect(screen.queryByRole("option")).toBeNull();
    expect(data().get("city")).toBe("");
  });

  it("closes and picks nothing once a ReadOnlyProvider turns read-only while it is open", async () => {
    const onOptionSubmit = vi.fn();
    const field = (readOnly: boolean) => (
      <ReadOnlyProvider readOnly={readOnly}>
        <Autocomplete label="City" options={cities} onOptionSubmit={onOptionSubmit} />
      </ReadOnlyProvider>
    );
    const { rerender } = render(field(false));
    await userEvent.type(screen.getByLabelText("City"), "ce");
    const cebu = await screen.findByRole("option", { name: "Cebu" });

    rerender(field(true));
    // The removed option can't be clicked: what a click on it would have done must not happen.
    cebu.click();
    expect(onOptionSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole("combobox")).toHaveValue("ce");
    expect(screen.getByRole("combobox")).toHaveAttribute("aria-expanded", "false");
  });

  it("stays closed when nothing matches, unless given a nothing-found message", async () => {
    const { unmount } = renderInForm(<Autocomplete label="City" options={cities} />);
    const input = screen.getByLabelText("City");
    await userEvent.type(input, "zzz");
    expect(input).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("No options found")).toBeNull();
    unmount();

    renderInForm(<Autocomplete label="Town" options={cities} nothingFoundMessage="No such city" />);
    await userEvent.type(screen.getByLabelText("Town"), "zzz");
    expect(await screen.findByText("No such city")).toBeInTheDocument();
  });

  it("keeps the previous suggestions while loading, with the spinner in the field only", async () => {
    const field = (loading: boolean) => (
      <Autocomplete label="City" options={cities} loading={loading} onSearchChange={() => {}} />
    );
    const { rerender } = render(field(false));
    await userEvent.click(screen.getByLabelText("City"));
    await screen.findByRole("option", { name: "Cebu" });
    // The live region is there before loading starts, so its change is announced.
    const status = document.querySelector('.bx-visually-hidden[role="status"]')!;
    expect(status).toHaveTextContent("");
    rerender(field(true));
    expect(screen.getByRole("option", { name: "Cebu" })).toBeInTheDocument();
    expect(screen.queryByText("Loading...")).toBeNull();
    expect(screen.getByText("Loading suggestions…")).toBe(status);
    expect(document.querySelector(".bx-Autocomplete-indicator .bx-Loader")).not.toBeNull();
    rerender(field(false));
    expect(status).toHaveTextContent("");
  });
});
