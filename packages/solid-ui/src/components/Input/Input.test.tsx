import { createSignal } from "solid-js";
import { render, screen } from "@solidjs/testing-library";

import { userEvent } from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { renderInForm } from "../../../test/helpers";
import { ReadOnlyProvider } from "../ReadOnly/ReadOnly";

import { Input } from "./Input";

describe("Input", () => {
  it("links its label, description and error to the input", () => {
    render(() => <Input label="Email" description="Work address" error="Required" required />);
    const input = screen.getByLabelText(/email/i);
    expect(input).toBeRequired();
    expect(input).toHaveAccessibleDescription("Work address Required");
    expect(input).toHaveAttribute("aria-invalid", "true");
  });

  it("submits its value through FormData", async () => {
    const { data } = renderInForm(() => <Input label="Name" name="name" />);
    await userEvent.type(screen.getByLabelText("Name"), "Ada");
    expect(data().get("name")).toBe("Ada");
  });

  it("restores defaultValue on form reset", async () => {
    const { data, reset } = renderInForm(() => (
      <Input label="Name" name="name" defaultValue="Ada" />
    ));
    const input = screen.getByLabelText("Name");
    await userEvent.clear(input);
    await userEvent.type(input, "Grace");
    expect(data().get("name")).toBe("Grace");
    await reset();
    expect(input).toHaveValue("Ada");
  });

  it("keeps a controlled value through a form reset", async () => {
    const [value] = createSignal("controlled");
    const { reset } = renderInForm(() => <Input label="Name" name="name" value={value()} />);
    await reset();
    expect(screen.getByLabelText("Name")).toHaveValue("controlled");
  });

  it("becomes read-only inside a ReadOnlyProvider", () => {
    render(() => (
      <ReadOnlyProvider readOnly={true}>
        <Input label="Name" />
      </ReadOnlyProvider>
    ));
    const input = screen.getByLabelText("Name");
    expect(input).toHaveAttribute("readonly");
    expect(input).toHaveAttribute("data-readonly");
  });
});
