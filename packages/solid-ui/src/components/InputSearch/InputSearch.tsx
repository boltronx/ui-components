import { createEffect, createSignal, type JSX, splitProps, untrack } from "solid-js";

import { CloseIcon } from "../../icons";
import { createSearchCall } from "../../utils/debounce";
import { afterFormReset, isCompositionKey, onFormReset } from "../../utils/form";
import { Input, type InputProps } from "../Input/Input";
import { useReadOnly } from "../ReadOnly/ReadOnly";

export interface InputSearchProps extends Omit<InputProps, "type" | "rightSection" | "inputMode"> {
  /** Replaces the cross on the clear button. */
  clearIcon?: JSX.Element;
  /**
   * Called to run the search: once typing pauses (see `onSearchDebounceMs`), and right away on
   * Enter or when cleared (with ""). The signal aborts when a newer search starts, so pass it to
   * fetch to drop stale responses. `onInput` stays the native event, called on every keystroke.
   */
  onSearch?: (value: string, signal: AbortSignal) => void;
  /** How long typing must pause before `onSearch` is called, in ms. Default 300; 0 calls on every keystroke. */
  onSearchDebounceMs?: number;
  /** Text shorter than this is not sent to `onSearch`, e.g. 3 for trigram search. */
  onSearchMinLength?: number;
}

export function InputSearch(props: InputSearchProps) {
  const [local, inputProps] = splitProps(props, [
    "ref",
    "inputClass",
    "clearIcon",
    "onSearch",
    "onSearchDebounceMs",
    "onSearchMinLength",
    "onKeyDown"
  ]);
  const search = createSearchCall({
    callback: () => local.onSearch,
    delay: () => local.onSearchDebounceMs,
    minLength: () => local.onSearchMinLength
  });
  const [hasValue, setHasValue] = createSignal(
    untrack(() => String(inputProps.value ?? inputProps.defaultValue ?? "").length > 0)
  );
  const isReadOnly = useReadOnly(() => inputProps.readOnly === true);
  let input: HTMLInputElement | undefined;

  createEffect(() => {
    if (inputProps.value !== undefined) setHasValue(String(inputProps.value).length > 0);
  });

  onFormReset(
    () => input,
    () => afterFormReset(() => setHasValue((input?.value.length ?? 0) > 0))
  );

  const clear = () => {
    if (!input) return;
    input.value = "";
    // An input event, so onInput handlers and form listeners see the clear like typing.
    input.dispatchEvent(
      new InputEvent("input", { bubbles: true, inputType: "deleteContentBackward" })
    );
    input.focus();
    search.now("");
  };

  const handleKeyDown: JSX.EventHandler<HTMLInputElement, KeyboardEvent> = event => {
    if (typeof local.onKeyDown === "function") local.onKeyDown(event);
    // Enter asks for results now; the form's own Enter handling is left as it is.
    if (event.key === "Enter" && !isCompositionKey(event)) search.now(event.currentTarget.value);
  };

  return (
    <Input
      {...inputProps}
      inputClass={local.inputClass ? `bx-InputSearch ${local.inputClass}` : "bx-InputSearch"}
      type="search"
      onKeyDown={handleKeyDown}
      ref={element => {
        input = element;
        element.addEventListener("input", () => {
          setHasValue(element.value.length > 0);
          search.schedule(element.value);
        });
        local.ref?.(element);
      }}
      rightSection={
        hasValue() && !inputProps.disabled && !isReadOnly()
          ? {
              pointerEvents: "all",
              node: (
                <button
                  type="button"
                  class="bx-Input-sectionButton"
                  aria-label="Clear search"
                  tabindex={-1}
                  onClick={clear}
                >
                  {local.clearIcon ?? <CloseIcon />}
                </button>
              )
            }
          : undefined
      }
    />
  );
}
