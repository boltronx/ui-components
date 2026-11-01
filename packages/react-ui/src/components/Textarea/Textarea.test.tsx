import { fireEvent, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { renderInForm } from "../../../test/helpers";
import { Button } from "../Button/Button";

import { Textarea } from "./Textarea";

describe("Textarea", () => {
  it("submits, counts and resets to defaultValue", async () => {
    const { data, reset } = renderInForm(
      <Textarea label="Notes" name="notes" defaultValue="hi" showCount maxLength={10} />
    );
    const textarea = screen.getByLabelText("Notes");
    expect(screen.getByText("2/10")).toBeInTheDocument();
    await userEvent.type(textarea, "!!");
    expect(data().get("notes")).toBe("hi!!");
    expect(screen.getByText("4/10")).toBeInTheDocument();
    await reset();
    expect(textarea).toHaveValue("hi");
    expect(screen.getByText("2/10")).toBeInTheDocument();
  });

  it("submits the form on Enter with submitOnEnter", async () => {
    const { form } = renderInForm(<Textarea label="Message" submitOnEnter />);
    const onSubmit = vi.fn((event: Event) => event.preventDefault());
    form.addEventListener("submit", onSubmit);
    await userEvent.type(screen.getByLabelText("Message"), "hello{Enter}");
    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it("doesn't submit on the Enter that confirms IME text, including Safari's late one", () => {
    const { form } = renderInForm(<Textarea label="Message" submitOnEnter />);
    const onSubmit = vi.fn((event: Event) => event.preventDefault());
    form.addEventListener("submit", onSubmit);
    const textarea = screen.getByLabelText("Message");
    fireEvent.keyDown(textarea, { key: "Enter", isComposing: true });
    // Safari: composition already over, but keyCode 229 marks the IME's Enter.
    fireEvent.keyDown(textarea, { key: "Enter", keyCode: 229 });
    expect(onSubmit).not.toHaveBeenCalled();
    fireEvent.keyDown(textarea, { key: "Enter" });
    expect(onSubmit).toHaveBeenCalledOnce();
  });
});

describe("Textarea submitOnEnter with a submit button", () => {
  it("submits through the form's submit button, as Enter in a field does", async () => {
    const { form } = renderInForm(
      <>
        <Textarea label="Message" submitOnEnter />
        <Button type="submit" name="intent" value="send">
          Send
        </Button>
      </>
    );
    const onSubmit = vi.fn((event: SubmitEvent) => event.preventDefault());
    form.addEventListener("submit", onSubmit);
    await userEvent.type(screen.getByLabelText("Message"), "hello{Enter}");
    expect(onSubmit).toHaveBeenCalledOnce();
    expect(onSubmit.mock.calls[0]![0].submitter).toBe(screen.getByRole("button", { name: "Send" }));
  });

  it("doesn't send the form again while its submit button is loading", async () => {
    const { form } = renderInForm(
      <>
        <Textarea label="Message" submitOnEnter />
        <Button type="submit" loading>
          Send
        </Button>
      </>
    );
    const onSubmit = vi.fn((event: Event) => event.preventDefault());
    form.addEventListener("submit", onSubmit);
    await userEvent.type(screen.getByLabelText("Message"), "hello{Enter}{Enter}");
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Message")).toHaveValue("hello");
  });

  it("does nothing when the form's submit button is disabled", async () => {
    const { form } = renderInForm(
      <>
        <Textarea label="Message" submitOnEnter />
        <Button type="submit" disabled>
          Send
        </Button>
      </>
    );
    const onSubmit = vi.fn((event: Event) => event.preventDefault());
    form.addEventListener("submit", onSubmit);
    await userEvent.type(screen.getByLabelText("Message"), "hello{Enter}");
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
