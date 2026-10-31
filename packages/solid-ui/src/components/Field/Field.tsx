import type { JSX } from "solid-js";
import { Show } from "solid-js";

import { type BaseProps, cx } from "../../utils/style";

export interface FieldOwnProps {
  label?: JSX.Element;
  description?: JSX.Element;
  /** Shown under the control, which is then marked `aria-invalid`. */
  error?: JSX.Element;
  required?: boolean;
}

export interface FieldProps extends FieldOwnProps, BaseProps {
  /** Id of the control the label points at. */
  id: string;
  /** For controls a <label for> cannot name (e.g. a div combobox): renders the label as a span. */
  labelId?: string;
  onLabelClick?: () => void;
  children: JSX.Element;
}

export const fieldIds = (id: string) => ({
  description: `${id}-description`,
  error: `${id}-error`
});

/** `aria-describedby` for a control inside a Field, or undefined when there is nothing to name. */
export function describedBy(id: string, props: FieldOwnProps): string | undefined {
  const ids = fieldIds(id);
  const parts = [props.description && ids.description, props.error && ids.error];
  return parts.filter(Boolean).join(" ") || undefined;
}

export function Field(props: FieldProps) {
  const ids = () => fieldIds(props.id);
  const labelContent = () => (
    <>
      {props.label}
      <Show when={props.required}>
        <span class="bx-Field-required" aria-hidden="true">
          *
        </span>
      </Show>
    </>
  );

  return (
    <div class={cx("bx-Field", props.class)} style={props.style}>
      <Show when={props.label}>
        <Show
          when={props.labelId}
          fallback={
            <label class="bx-Field-label" for={props.id}>
              {labelContent()}
            </label>
          }
        >
          <span id={props.labelId} class="bx-Field-label" onClick={() => props.onLabelClick?.()}>
            {labelContent()}
          </span>
        </Show>
      </Show>
      <Show when={props.description}>
        <p id={ids().description} class="bx-Field-description">
          {props.description}
        </p>
      </Show>
      {props.children}
      {/*
        Always rendered, empty without an error: a live region only speaks reliably when it was
        on the page before its text changed. The control links to it only while there is one.
      */}
      <p id={ids().error} class="bx-Field-error" aria-live="polite">
        {props.error}
      </p>
    </div>
  );
}
