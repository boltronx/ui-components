import { createSignal, type JSX, onCleanup, onMount, splitProps } from "solid-js";

import { EyeIcon, EyeOffIcon } from "../../icons";
import { Input, type InputProps } from "../Input/Input";

export interface InputPasswordProps extends Omit<
  InputProps,
  "type" | "rightSection" | "inputMode"
> {
  /** Replaces the eye on the toggle button; `visible` is true while the password is shown. */
  visibilityToggleIcon?: (props: { visible: boolean }) => JSX.Element;
}

export function InputPassword(props: InputPasswordProps) {
  const [local, inputProps] = splitProps(props, ["visibilityToggleIcon", "ref"]);
  const [visible, setVisible] = createSignal(false);
  let input: HTMLInputElement | undefined;

  // Submitted while shown, the field is a text input, and browsers may keep a text input's value
  // in their autofill history. Hiding it on submit sends it as a password.
  onMount(() => {
    const form = input?.form;
    if (!form) return;
    const hide = () => setVisible(false);
    form.addEventListener("submit", hide);
    onCleanup(() => form.removeEventListener("submit", hide));
  });

  return (
    <Input
      {...inputProps}
      ref={element => {
        input = element;
        local.ref?.(element);
      }}
      inputClass={
        inputProps.inputClass ? `bx-InputPassword ${inputProps.inputClass}` : "bx-InputPassword"
      }
      type={visible() ? "text" : "password"}
      rightSection={{
        pointerEvents: "all",
        node: (
          <button
            type="button"
            class="bx-Input-sectionButton"
            // The label says the state; aria-pressed too would read "Hide password, pressed".
            aria-label={visible() ? "Hide password" : "Show password"}
            disabled={inputProps.disabled}
            onClick={() => setVisible(value => !value)}
          >
            {local.visibilityToggleIcon?.({ visible: visible() }) ??
              (visible() ? <EyeOffIcon /> : <EyeIcon />)}
          </button>
        )
      }}
    />
  );
}
