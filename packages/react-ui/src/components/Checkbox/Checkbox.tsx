"use client";

import { type ChangeEvent, type ReactNode, type Ref, useId, useLayoutEffect, useRef } from "react";

import { afterFormReset, useFormReset } from "../../utils/form";
import { useMergedRefs } from "../../utils/refs";
import { type BaseProps, cx } from "../../utils/style";
import { describedBy, fieldIds } from "../Field/Field";
import { useReadOnly } from "../ReadOnly/ReadOnly";

/** What Checkbox and Switch share: both are an <input type="checkbox"> with a label. */
export interface CheckboxBaseProps extends BaseProps {
  id?: string;
  name?: string;
  /** Submitted when checked. Default "on", like a native checkbox. */
  value?: string;
  /** Controlled state. The parent owns it; clicks only report through `onChange`. */
  checked?: boolean;
  /** Uncontrolled starting state; a form reset restores it. */
  defaultChecked?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  label?: ReactNode;
  description?: ReactNode;
  /** Shown under the label; the box is then marked `aria-invalid`. */
  error?: ReactNode;
  /** Names a box without a visible `label`, e.g. the select box of a table row. */
  "aria-label"?: string;
  /** Id of an element that names the box, for a label that lives elsewhere. */
  "aria-labelledby"?: string;
  /** Which side of the control the label goes on. Default "right". */
  labelPosition?: "left" | "right";
  ref?: Ref<HTMLInputElement>;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
}

export interface CheckboxProps extends CheckboxBaseProps {
  /**
   * Shows a dash for "some but not all", e.g. a select-all box over a partly picked list. It is
   * only a look: `checked` still decides what submits, and a click clears it, so update it from
   * `onChange`. Screen readers announce it as "mixed".
   */
  indeterminate?: boolean;
}

interface CheckboxControlProps extends CheckboxBaseProps {
  variant: "checkbox" | "switch";
  indeterminate?: boolean;
  /** Extra attributes for the row, e.g. a switch's size. */
  rootProps?: Record<`data-${string}`, string | undefined>;
  /** Draws around the input, e.g. a switch's track and thumb. */
  renderControl?: (input: ReactNode) => ReactNode;
}

/**
 * The checkbox behind Checkbox and Switch. Both are an <input type="checkbox">, so they submit,
 * reset and validate alike; a switch adds role="switch" and draws its own track around the input.
 */
export function CheckboxControl(props: CheckboxControlProps) {
  const generatedId = useId();
  const inputId = props.id ?? `bx-${props.variant}-${generatedId}`;
  const isReadOnly = useReadOnly(props.readOnly);
  const input = useRef<HTMLInputElement>(null);
  const inputRef = useMergedRefs(input, props.ref);

  // `indeterminate` is a DOM property with no HTML attribute, so it can only be set once mounted,
  // and again after every render: a click clears it in the browser.
  useLayoutEffect(() => {
    if (input.current) input.current.indeterminate = props.indeterminate === true;
  });

  // React keeps a controlled box on the parent's state after a click, but a form reset restores
  // the box after its event, behind React's back, so that is undone once the reset finishes.
  useFormReset(input, () => {
    const checked = props.checked;
    if (checked === undefined) return;
    afterFormReset(() => {
      if (input.current) input.current.checked = checked;
    });
  });

  const control = (
    <input
      type="checkbox"
      ref={inputRef}
      id={inputId}
      className={props.variant === "switch" ? "bx-Switch-input" : "bx-Checkbox-input"}
      name={props.name}
      value={props.value ?? "on"}
      checked={props.checked}
      defaultChecked={props.checked === undefined ? props.defaultChecked : undefined}
      disabled={props.disabled}
      required={props.required}
      role={props.variant === "switch" ? "switch" : undefined}
      aria-label={props["aria-label"]}
      aria-labelledby={props["aria-labelledby"]}
      aria-readonly={isReadOnly || undefined}
      aria-invalid={props.error ? true : undefined}
      aria-describedby={describedBy(inputId, props)}
      onChange={event => {
        // The click has cleared `indeterminate`; like `checked`, it stays what the parent says
        // until the parent changes it, which re-renders and runs the effect above.
        if (props.indeterminate) event.currentTarget.indeterminate = true;
        if (isReadOnly) {
          // Undone here rather than cancelled with preventDefault on click: React fires
          // onChange from that same click anyway, and for a controlled box its restore and the
          // browser's undo of a cancelled click flip the box twice, leaving it toggled. A
          // controlled box is put back by React; an uncontrolled one is put back here.
          if (props.checked === undefined) {
            event.currentTarget.checked = !event.currentTarget.checked;
          }
          return;
        }
        props.onChange?.(event);
      }}
    />
  );

  return (
    <div
      {...props.rootProps}
      className={cx("bx-Checkbox", props.variant === "switch" && "bx-Switch", props.className)}
      style={props.style}
      data-readonly={isReadOnly ? "" : undefined}
      data-disabled={props.disabled ? "" : undefined}
      data-align-start={props.description ? "" : undefined}
      data-label-position={props.labelPosition === "left" ? "left" : undefined}
      onClick={event => {
        // The whole row toggles, not just the box and its label.
        if ((event.target as HTMLElement).closest("input, label")) return;
        if (props.disabled || isReadOnly) return;
        input.current?.click();
      }}
    >
      {props.renderControl ? props.renderControl(control) : control}
      {props.label || props.description || props.error ? (
        <div className="bx-Checkbox-body">
          {props.label ? (
            <label className="bx-Checkbox-label" htmlFor={inputId}>
              {props.label}
            </label>
          ) : null}
          {props.description ? (
            <p id={fieldIds(inputId).description} className="bx-Checkbox-description">
              {props.description}
            </p>
          ) : null}
          {/* Always there while the body is, so its live region speaks when an error appears. */}
          <p id={fieldIds(inputId).error} className="bx-Checkbox-error" aria-live="polite">
            {props.error}
          </p>
        </div>
      ) : null}
    </div>
  );
}

/** A box to tick: submits `value` (default "on") under `name` when checked. */
export function Checkbox(props: CheckboxProps) {
  return <CheckboxControl {...props} variant="checkbox" />;
}
