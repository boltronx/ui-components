"use client";

import { type ReactNode, useRef, useState } from "react";

import { CloseIcon } from "../../icons";
import { useSearchCall } from "../../utils/debounce";
import { setNativeValue } from "../../utils/dom";
import { afterFormReset, isCompositionKey, useFormReset } from "../../utils/form";
import { useMergedRefs } from "../../utils/refs";
import { Input, type InputProps } from "../Input/Input";
import { useReadOnly } from "../ReadOnly/ReadOnly";

export interface InputSearchProps extends Omit<InputProps, "type" | "rightSection" | "inputMode"> {
  /** Replaces the cross on the clear button. */
  clearIcon?: ReactNode;
  /**
   * Called to run the search: once typing pauses (see `onSearchDebounceMs`), and right away on
   * Enter or when cleared (with ""). The signal aborts when a newer search starts, so pass it to
   * fetch to drop stale responses. `onChange` stays the input's own event, called on every keystroke.
   */
  onSearch?: (value: string, signal: AbortSignal) => void;
  /** How long typing must pause before `onSearch` is called, in ms. Default 300; 0 calls on every keystroke. */
  onSearchDebounceMs?: number;
  /** Text shorter than this is not sent to `onSearch`, e.g. 3 for trigram search. */
  onSearchMinLength?: number;
}

export function InputSearch({
  ref,
  inputClassName,
  clearIcon,
  onSearch,
  onSearchDebounceMs,
  onSearchMinLength,
  onKeyDown,
  onChange,
  ...inputProps
}: InputSearchProps) {
  const search = useSearchCall({
    callback: onSearch,
    delay: onSearchDebounceMs,
    minLength: onSearchMinLength
  });
  const [hasValueState, setHasValue] = useState(
    () => String(inputProps.value ?? inputProps.defaultValue ?? "").length > 0
  );
  const hasValue =
    inputProps.value !== undefined ? String(inputProps.value).length > 0 : hasValueState;
  const isReadOnly = useReadOnly(inputProps.readOnly);
  const input = useRef<HTMLInputElement>(null);
  const inputRef = useMergedRefs(input, ref);

  useFormReset(input, () =>
    afterFormReset(() => setHasValue((input.current?.value.length ?? 0) > 0))
  );

  const clear = () => {
    const element = input.current;
    if (!element) return;
    // An input event, so onChange handlers and form listeners see the clear like typing.
    setNativeValue(element, "");
    element.focus();
    search.now("");
  };

  return (
    <Input
      {...inputProps}
      inputClassName={inputClassName ? `bx-InputSearch ${inputClassName}` : "bx-InputSearch"}
      type="search"
      ref={inputRef}
      onChange={event => {
        onChange?.(event);
        setHasValue(event.currentTarget.value.length > 0);
        search.schedule(event.currentTarget.value);
      }}
      onKeyDown={event => {
        onKeyDown?.(event);
        // Enter asks for results now; the form's own Enter handling is left as it is.
        if (event.key === "Enter" && !isCompositionKey(event.nativeEvent)) {
          search.now(event.currentTarget.value);
        }
      }}
      rightSection={
        hasValue && !inputProps.disabled && !isReadOnly
          ? {
              pointerEvents: "all",
              node: (
                <button
                  type="button"
                  className="bx-Input-sectionButton"
                  aria-label="Clear search"
                  tabIndex={-1}
                  onClick={clear}
                >
                  {clearIcon ?? <CloseIcon />}
                </button>
              )
            }
          : undefined
      }
    />
  );
}
