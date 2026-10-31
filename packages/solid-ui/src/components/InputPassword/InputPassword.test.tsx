import { screen } from "@solidjs/testing-library";

import { userEvent } from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { renderInForm } from "../../../test/helpers";

import { InputPassword } from "./InputPassword";

describe("InputPassword", () => {
  it("toggles visibility and submits the value either way", async () => {
    const { data } = renderInForm(() => <InputPassword label="Password" name="password" />);
    const input = screen.getByLabelText("Password");
    expect(input).toHaveAttribute("type", "password");

    await userEvent.type(input, "hunter2");
    const toggle = screen.getByRole("button", { name: "Show password" });
    // Its label says the state, so it isn't also a pressed toggle ("Hide password, pressed").
    expect(toggle).not.toHaveAttribute("aria-pressed");

    await userEvent.click(toggle);
    expect(input).toHaveAttribute("type", "text");
    expect(toggle).toHaveAccessibleName("Hide password");
    expect(toggle).not.toHaveAttribute("aria-pressed");
    expect(data().get("password")).toBe("hunter2");

    await userEvent.click(screen.getByRole("button", { name: "Hide password" }));
    expect(input).toHaveAttribute("type", "password");
  });

  it("hides the password again when the form submits, so it goes as a password", async () => {
    let typeOnSubmit: string | null = null;
    const { form } = renderInForm(() => (
      <InputPassword label="Password" name="password" defaultValue="hunter2" />
    ));
    const input = screen.getByLabelText("Password");
    // Registered after the component's, as an app's handler would be.
    form.addEventListener("submit", event => {
      event.preventDefault();
      typeOnSubmit = input.getAttribute("type");
    });
    await userEvent.click(screen.getByRole("button", { name: "Show password" }));
    expect(input).toHaveAttribute("type", "text");
    form.requestSubmit();
    expect(typeOnSubmit).toBe("password");
    expect(input).toHaveAttribute("type", "password");
    expect(screen.getByRole("button", { name: "Show password" })).toBeInTheDocument();
  });

  it("disables the toggle with the input", () => {
    renderInForm(() => <InputPassword label="Password" disabled />);
    expect(screen.getByRole("button", { name: "Show password" })).toBeDisabled();
  });
});
