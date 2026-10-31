import type { JSX } from "solid-js";
import { render } from "@solidjs/testing-library";

/**
 * Resets a form in the order a browser uses when the user clicks a reset button: the reset event,
 * then a microtask checkpoint, then the controls restored to their defaults. jsdom's form.reset()
 * restores the controls before any microtask runs, which hides work queued too early.
 */
async function resetLikeAUser(form: HTMLFormElement) {
  if (!form.dispatchEvent(new Event("reset", { bubbles: true, cancelable: true }))) return;
  await Promise.resolve();
  await Promise.resolve();
  for (const element of Array.from(form.elements)) {
    if (element instanceof HTMLInputElement) {
      element.value = element.defaultValue;
      element.checked = element.defaultChecked;
    } else if (element instanceof HTMLTextAreaElement) {
      element.value = element.defaultValue;
    } else if (element instanceof HTMLSelectElement) {
      for (const option of Array.from(element.options)) option.selected = option.defaultSelected;
    }
  }
  // Components finish their post-reset work in a task (see afterFormReset).
  await new Promise(resolve => setTimeout(resolve));
}

/** Renders `children` inside a <form> and returns helpers to read and reset it. */
export function renderInForm(children: () => JSX.Element) {
  const result = render(() => <form data-testid="form">{children()}</form>);
  const form = result.getByTestId("form") as HTMLFormElement;
  return {
    ...result,
    form,
    data: () => new FormData(form),
    /** Resets the form as a user's click on a reset button would, and waits for it to settle. */
    reset: () => resetLikeAUser(form)
  };
}
