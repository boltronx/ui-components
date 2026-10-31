import type { ButtonHTMLAttributes, ReactNode, Ref } from "react";

import { type BaseProps, cx } from "../../utils/style";
import { Loader } from "../Loader/Loader";

export type ButtonVariant = "default" | "primary" | "danger" | "light" | "subtle";

type NativeButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "className" | "style" | "children"
>;

export interface ButtonProps extends NativeButtonProps, BaseProps {
  children?: ReactNode;
  variant?: ButtonVariant;
  fullWidth?: boolean;
  /**
   * Shows a spinner and blocks clicks, keeping the button's look and keyboard focus (it is
   * aria-disabled, not disabled). A loading submit button also keeps Enter in a field from sending
   * its form again, e.g. `loading={pending}` from `useFormStatus`. Its clicks still bubble (stopping
   * them takes a handler, which a Server Component can't have), so an ancestor that handles clicks
   * for it skips those from inside `[aria-disabled="true"]`, as Menu.Target does.
   */
  loading?: boolean;
  leftSection?: ReactNode;
  rightSection?: ReactNode;
  ref?: Ref<HTMLButtonElement>;
}

/** HTML invoker commands (`<button commandfor="dialog" command="show-modal">`). */
interface InvokerAttributes {
  command?: string;
  commandfor?: string;
}

// No hooks, so it renders in a Server Component too, e.g. a submit button for a server action.
export function Button({
  children,
  className,
  variant,
  fullWidth,
  loading,
  leftSection,
  rightSection,
  disabled,
  type,
  onClick,
  onClickCapture,
  popoverTarget,
  popoverTargetAction,
  // Anything not declared above (aria-*, data-*, form, name, value, ...) goes to the <button>.
  ...others
}: ButtonProps) {
  // Invoker commands aren't in React's types yet, but React renders them, lowercase, when passed
  // untyped (it warns about a camelCase commandFor, so that spelling isn't one to support).
  const { command, commandfor, ...native } = others as typeof others & InvokerAttributes;
  // While loading, a click (Enter and Space dispatch one too) must do nothing. Without these a
  // type="button" could still open a popover or run a command.
  const actions = loading
    ? undefined
    : { onClick, onClickCapture, popoverTarget, popoverTargetAction, command, commandfor };
  const button = (
    <button
      {...native}
      {...actions}
      // "button", not the native "submit", so a button in a form never submits by accident.
      // While loading it can't submit either, but it isn't `disabled`: a disabled button drops
      // keyboard focus, so a focused submit button would send focus to <body> as it starts.
      type={loading ? "button" : (type ?? "button")}
      className={cx("bx-Button", className)}
      data-variant={variant ?? "default"}
      data-loading={loading ? "" : undefined}
      data-full-width={fullWidth ? "" : undefined}
      data-with-left={loading || leftSection ? "" : undefined}
      data-with-right={rightSection ? "" : undefined}
      disabled={disabled}
      aria-disabled={loading || native["aria-disabled"]}
      aria-busy={loading || undefined}
    >
      {loading ? (
        <span className="bx-Button-section">
          <Loader size="xs" color="currentColor" />
        </span>
      ) : leftSection ? (
        <span className="bx-Button-section">{leftSection}</span>
      ) : null}
      <span className="bx-Button-label">{children}</span>
      {rightSection ? <span className="bx-Button-section">{rightSection}</span> : null}
    </button>
  );
  // A loading submit button is type="button", so it isn't the form's default button any more,
  // and Enter in a lone field would submit the form again (implicit submission). A disabled
  // submit button just before it takes over as the default button, and a disabled default
  // button makes Enter do nothing. No handler needed, so this still renders on the server.
  // Always a fragment with the button second, so React keeps the button (and its focus) as
  // loading starts and ends.
  return (
    <>
      {loading && type === "submit" ? (
        <button type="submit" form={native.form} disabled hidden aria-hidden="true" tabIndex={-1} />
      ) : null}
      {button}
    </>
  );
}
