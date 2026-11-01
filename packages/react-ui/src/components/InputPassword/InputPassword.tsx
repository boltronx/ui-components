"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";

import { EyeIcon, EyeOffIcon } from "../../icons";
import { useMergedRefs } from "../../utils/refs";
import { Input, type InputProps } from "../Input/Input";

export interface InputPasswordProps extends Omit<
  InputProps,
  "type" | "rightSection" | "inputMode"
> {
  /** Replaces the eye on the toggle button; `visible` is true while the password is shown. */
  visibilityToggleIcon?: (props: { visible: boolean }) => ReactNode;
}

export function InputPassword({ visibilityToggleIcon, ref, ...inputProps }: InputPasswordProps) {
  const [visible, setVisible] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const inputRef = useMergedRefs(input, ref);

  // Submitted while shown, the field is a text input, and browsers may keep a text input's value
  // in their autofill history. So it is hidden on submit, in the DOM right away (the browser reads
  // the form before React would re-render) and in state to match.
  useEffect(() => {
    const element = input.current;
    const form = element?.form;
    if (!element || !form) return;
    const hide = () => {
      element.type = "password";
      setVisible(false);
    };
    form.addEventListener("submit", hide);
    return () => form.removeEventListener("submit", hide);
  }, []);

  return (
    <Input
      {...inputProps}
      ref={inputRef}
      inputClassName={
        inputProps.inputClassName
          ? `bx-InputPassword ${inputProps.inputClassName}`
          : "bx-InputPassword"
      }
      type={visible ? "text" : "password"}
      rightSection={{
        pointerEvents: "all",
        node: (
          <button
            type="button"
            className="bx-Input-sectionButton"
            // The label says what a press does; aria-pressed as well would be read as
            // "Hide password, pressed".
            aria-label={visible ? "Hide password" : "Show password"}
            disabled={inputProps.disabled}
            onClick={() => setVisible(value => !value)}
          >
            {visibilityToggleIcon?.({ visible }) ?? (visible ? <EyeOffIcon /> : <EyeIcon />)}
          </button>
        )
      }}
    />
  );
}
