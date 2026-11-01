import type { JSX } from "solid-js";
import { createEffect, createMemo, createUniqueId, splitProps } from "solid-js";

import { afterFormReset, onFormReset } from "../../utils/form";
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
  label?: JSX.Element;
  description?: JSX.Element;
  /** Shown under the label; the box is then marked `aria-invalid`. */
  error?: JSX.Element;
  /** Names a box without a visible `label`, e.g. the select box of a table row. */
  "aria-label"?: string;
  /** Id of an element that names the box, for a label that lives elsewhere. */
  "aria-labelledby"?: string;
  /** Which side of the control the label goes on. Default "right". */
  labelPosition?: "left" | "right";
  ref?: (el: HTMLInputElement) => void;
  onChange?: JSX.EventHandler<HTMLInputElement, Event>;
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
  renderControl?: (input: JSX.Element) => JSX.Element;
}

const ROW_CLICK_EXCLUDED =
  'input, label, a[href], button, select, textarea, summary, [role="button"], [role="link"], [tabindex]';

/**
 * The checkbox behind Checkbox and Switch. Both are an <input type="checkbox">, so they submit,
 * reset and validate alike; a switch adds role="switch" and draws its own track around the input.
 */
export function CheckboxControl(props: CheckboxControlProps) {
  const [local, rest] = splitProps(props, [
    "class",
    "style",
    "id",
    "label",
    "description",
    "error",
    "variant",
    "readOnly",
    "defaultChecked",
    "indeterminate",
    "labelPosition",
    "rootProps",
    "renderControl",
    "ref"
  ]);

  const generatedId = createUniqueId();
  const inputId = () => local.id ?? `bx-${local.variant}-${generatedId}`;
  const isReadOnly = useReadOnly(() => local.readOnly === true);
  // Props the event handlers read, as memos: a handler has no reactive owner, and reading a prop
  // written as a condition (`indeterminate={some() && !all()}`) there would make Solid create a
  // computation that is never disposed.
  const indeterminate = createMemo(() => local.indeterminate === true);
  const checked = createMemo(() => rest.checked);
  const disabled = createMemo(() => rest.disabled === true);
  let input: HTMLInputElement | undefined;

  // `indeterminate` is a DOM property with no HTML attribute, so it is set on the element.
  createEffect(() => {
    if (input) input.indeterminate = indeterminate();
  });

  // A controlled box shows the parent's state, so a click or a reset is undone once it finishes.
  // A click has toggled the box before its events, so a microtask is late enough for it; a reset
  // restores the box after its event, so that waits for afterFormReset.
  const restore = (checked: boolean | undefined, schedule = queueMicrotask) => {
    if (checked === undefined) return;
    schedule(() => {
      if (input) input.checked = checked;
    });
  };
  onFormReset(
    () => input,
    () => restore(checked(), afterFormReset)
  );

  const control = (
    <input
      type="checkbox"
      ref={el => {
        input = el;
        if (local.defaultChecked !== undefined) el.defaultChecked = local.defaultChecked;
        local.ref?.(el);
      }}
      id={inputId()}
      class={local.variant === "switch" ? "bx-Switch-input" : "bx-Checkbox-input"}
      name={rest.name}
      value={rest.value ?? "on"}
      // Solid assigns `checked` after the ref, so uncontrolled boxes start from defaultChecked here.
      checked={rest.checked ?? local.defaultChecked}
      disabled={rest.disabled}
      required={rest.required}
      role={local.variant === "switch" ? "switch" : undefined}
      aria-label={rest["aria-label"]}
      aria-labelledby={rest["aria-labelledby"]}
      aria-readonly={isReadOnly() || undefined}
      aria-invalid={local.error ? true : undefined}
      aria-describedby={describedBy(inputId(), local)}
      onClick={event => {
        if (isReadOnly()) event.preventDefault();
      }}
      onChange={event => {
        // The click has cleared `indeterminate`; like `checked`, it stays what the parent says.
        if (indeterminate()) event.currentTarget.indeterminate = true;
        rest.onChange?.(event);
        // Read after onChange, so a parent that updates right away keeps the new state.
        restore(checked());
      }}
    />
  );

  return (
    <div
      {...local.rootProps}
      class={cx("bx-Checkbox", local.variant === "switch" && "bx-Switch", local.class)}
      style={local.style}
      data-readonly={isReadOnly() ? "" : undefined}
      data-disabled={rest.disabled ? "" : undefined}
      data-align-start={local.description ? "" : undefined}
      data-label-position={local.labelPosition === "left" ? "left" : undefined}
      onClick={event => {
        // The whole row toggles, not just the box and its label, except for a click that is a
        // control's own, e.g. a link to the terms in the description.
        // Only controls within this row count: a Modal's own section[tabindex] isn't one.
        const control = (event.target as HTMLElement).closest(ROW_CLICK_EXCLUDED);
        if (control && event.currentTarget.contains(control)) return;
        // A label around the row clicks the input itself.
        if (event.currentTarget.parentElement?.closest("label")) return;
        if (disabled() || isReadOnly()) return;
        input?.click();
      }}
    >
      {local.renderControl ? local.renderControl(control) : control}
      {local.label || local.description || local.error ? (
        <div class="bx-Checkbox-body">
          {local.label ? (
            <label class="bx-Checkbox-label" for={inputId()}>
              {local.label}
            </label>
          ) : null}
          {local.description ? (
            <p id={fieldIds(inputId()).description} class="bx-Checkbox-description">
              {local.description}
            </p>
          ) : null}
          {/* Always there while the body is, so its live region speaks when an error appears. */}
          <p id={fieldIds(inputId()).error} class="bx-Checkbox-error" aria-live="polite">
            {local.error}
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
