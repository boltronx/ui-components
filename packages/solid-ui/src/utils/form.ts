import { type Accessor, createMemo, createSignal, onCleanup, onMount, untrack } from "solid-js";

/**
 * Runs `handler` when the element's form is reset. The reset event fires before the browser
 * restores native controls, so state set here is in place by the time they repaint. Work that
 * must see or override the restored controls goes through `afterFormReset`.
 */
export function onFormReset(element: Accessor<HTMLElement | undefined>, handler: () => void) {
  onMount(() => {
    const el = element();
    const form = (el as HTMLInputElement | undefined)?.form ?? el?.closest("form");
    if (!form) return;
    form.addEventListener("reset", handler);
    onCleanup(() => form.removeEventListener("reset", handler));
  });
}

/**
 * Runs `fn` once a form reset has finished restoring the native controls. Not a microtask: after a
 * user clicks a reset button, microtasks run between the reset event and the restore, so work
 * queued that way is undone. A task runs after it.
 */
export function afterFormReset(fn: () => void) {
  setTimeout(fn);
}

/**
 * Keeps a controlled value on a native control after a form reset. The browser resets a control to
 * its default, but a controlled value belongs to the parent, so it is written back once the reset
 * finishes.
 */
export function keepControlledOnReset(
  element: Accessor<HTMLInputElement | HTMLTextAreaElement | undefined>,
  value: Accessor<string | number | undefined>
) {
  // Read after a reset, outside any reactive owner; see createControllableSignal.
  const controlled = createMemo(value);
  onFormReset(element, () => {
    if (controlled() === undefined) return;
    afterFormReset(() => {
      const el = element();
      const current = controlled();
      if (el && current !== undefined) el.value = String(current);
    });
  });
}

/**
 * State for a component that is controlled when `value` is defined and keeps its own state
 * otherwise, starting from (and resetting to) `defaultValue`.
 */
export function createControllableSignal<T>(options: {
  value: Accessor<T | undefined>;
  defaultValue: Accessor<T>;
}) {
  // Memos, made with the component: the value is read in event handlers and on form reset, which
  // have no reactive owner, and reading a prop written as a condition (`value={a() ? b : c}`)
  // there would make Solid create a computation that is never disposed.
  const controlled = createMemo(options.value);
  const defaultValue = createMemo(options.defaultValue);
  const [internal, setInternal] = createSignal<T>(untrack(defaultValue));
  const isControlled = () => controlled() !== undefined;
  const value = () => (isControlled() ? (controlled() as T) : internal());
  /** Stores the value when uncontrolled; a controlled parent applies it through `value`. */
  const setValue = (next: T) => {
    if (!untrack(isControlled)) setInternal(() => next);
  };
  const reset = () => setValue(untrack(defaultValue));
  return { value, setValue, reset, isControlled };
}

/**
 * Whether a key press belongs to an IME composition, e.g. the Enter that confirms Japanese or
 * Chinese text, so it must not submit. Safari sends that Enter after the composition has ended,
 * with `isComposing` false, but still with keyCode 229.
 */
export function isCompositionKey(event: KeyboardEvent): boolean {
  // keyCode is deprecated, but it is the only signal Safari gives.
  return event.isComposing || event.keyCode === 229;
}

/**
 * Submits `form` the way Enter in a text field does (implicit submission): by clicking its
 * default button, its first submit button. That click is what a loading Button cancels, so a form
 * that is still sending isn't sent again; a disabled default button means Enter does nothing.
 * `form.requestSubmit()` would skip the button and submit regardless. A form without a submit
 * button is submitted directly.
 */
export function submitImplicitly(form: HTMLFormElement) {
  const defaultButton = Array.from(
    (form.getRootNode() as ParentNode).querySelectorAll<HTMLButtonElement | HTMLInputElement>(
      "button, input"
    )
  ).find(
    element =>
      element.form === form &&
      ((element instanceof HTMLButtonElement && element.type === "submit") ||
        (element instanceof HTMLInputElement &&
          (element.type === "submit" || element.type === "image")))
  );
  if (!defaultButton) form.requestSubmit();
  else if (!defaultButton.disabled) defaultButton.click();
}

/**
 * Moves focus to the first field marked invalid, so after a failed submit a screen reader reads
 * that field, "invalid" and its error, and a keyboard user lands where the fix is needed. Call it
 * once the errors are set; it waits a microtask so they have rendered. Resolves with the field it
 * focused, or undefined when every field is valid.
 */
export async function focusFirstInvalid(
  root: ParentNode = document
): Promise<HTMLElement | undefined> {
  await Promise.resolve();
  const field = root.querySelector<HTMLElement>('[aria-invalid="true"]:not([disabled])');
  field?.focus();
  return field ?? undefined;
}
