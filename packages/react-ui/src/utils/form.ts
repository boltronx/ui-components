"use client";

import { type RefObject, useCallback, useEffect, useRef, useState } from "react";

/** A ref that always holds the latest value, for event handlers that outlive a render. */
export function useLatest<T>(value: T): RefObject<T> {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}

/**
 * Runs `handler` when the element's form is reset. The reset event fires before the browser
 * restores native controls, so state set here is in place by the time they repaint. Work that
 * must see or override the restored controls goes through `afterFormReset`.
 */
export function useFormReset(element: RefObject<HTMLElement | null>, handler: () => void) {
  const latest = useLatest(handler);
  useEffect(() => {
    const el = element.current;
    const form = (el as HTMLInputElement | null)?.form ?? el?.closest("form");
    if (!form) return;
    const onReset = () => latest.current();
    form.addEventListener("reset", onReset);
    return () => form.removeEventListener("reset", onReset);
  }, [element, latest]);
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
export function useKeepControlledOnReset(
  element: RefObject<HTMLInputElement | HTMLTextAreaElement | null>,
  value: string | number | undefined
) {
  const latest = useLatest(value);
  useFormReset(element, () => {
    if (latest.current === undefined) return;
    afterFormReset(() => {
      const el = element.current;
      const current = latest.current;
      if (el && current !== undefined) el.value = String(current);
    });
  });
}

/**
 * State for a component that is controlled when `value` is defined and keeps its own state
 * otherwise, starting from (and resetting to) `defaultValue`.
 */
export function useControllableState<T>(options: { value: T | undefined; defaultValue: T }) {
  const [internal, setInternal] = useState<T>(options.defaultValue);
  const isControlled = options.value !== undefined;
  const value = isControlled ? (options.value as T) : internal;
  const controlled = useLatest(isControlled);
  const defaultValue = useLatest(options.defaultValue);
  /** Stores the value when uncontrolled; a controlled parent applies it through `value`. */
  const setValue = useCallback(
    (next: T) => {
      if (!controlled.current) setInternal(() => next);
    },
    [controlled]
  );
  const reset = useCallback(() => setValue(defaultValue.current), [setValue, defaultValue]);
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
      (element.type === "submit" ||
        (element instanceof HTMLInputElement && element.type === "image"))
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
