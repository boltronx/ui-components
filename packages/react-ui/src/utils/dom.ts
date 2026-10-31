/**
 * Whether an event on `target` comes from an aria-disabled control within `container`, e.g. a
 * loading Button. Such a control keeps focus and still gets clicks (Enter and Space dispatch one
 * too), so a component that acts on them by delegation, from an ancestor, must skip them.
 */
export function isFromDisabled(target: EventTarget | null, container: Element): boolean {
  const disabled = target instanceof Element ? target.closest('[aria-disabled="true"]') : null;
  return !!disabled && container.contains(disabled);
}

/**
 * Sets a control's value the way typing does, then fires `input`. React tracks the value a
 * control had at its last render and skips onChange when nothing changed, so the value goes
 * through the native setter, past that tracker.
 */
export function setNativeValue(element: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const prototype = Object.getPrototypeOf(element) as object;
  const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
  if (setter) setter.call(element, value);
  else element.value = value;
  element.dispatchEvent(
    new InputEvent("input", { bubbles: true, inputType: "deleteContentBackward" })
  );
}
