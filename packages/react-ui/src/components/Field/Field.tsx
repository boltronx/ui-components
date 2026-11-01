import type { ReactNode } from "react";

import { type BaseProps, cx } from "../../utils/style";

export interface FieldOwnProps {
  label?: ReactNode;
  description?: ReactNode;
  /** Shown under the control, which is then marked `aria-invalid`. */
  error?: ReactNode;
  required?: boolean;
}

export interface FieldProps extends FieldOwnProps, BaseProps {
  /** Id of the control the label points at. */
  id: string;
  /** For controls a <label for> cannot name (e.g. a div combobox): renders the label as a span. */
  labelId?: string;
  onLabelClick?: () => void;
  children: ReactNode;
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
  const ids = fieldIds(props.id);
  const labelContent = (
    <>
      {props.label}
      {props.required && (
        <span className="bx-Field-required" aria-hidden="true">
          *
        </span>
      )}
    </>
  );

  return (
    <div className={cx("bx-Field", props.className)} style={props.style}>
      {props.label ? (
        props.labelId ? (
          <span
            id={props.labelId}
            className="bx-Field-label"
            onClick={() => props.onLabelClick?.()}
          >
            {labelContent}
          </span>
        ) : (
          <label className="bx-Field-label" htmlFor={props.id}>
            {labelContent}
          </label>
        )
      ) : null}
      {props.description ? (
        <p id={ids.description} className="bx-Field-description">
          {props.description}
        </p>
      ) : null}
      {props.children}
      {/*
        Always rendered, empty without an error: a live region only speaks reliably when it was
        on the page before its text changed. The control links to it only while there is one.
      */}
      <p id={ids.error} className="bx-Field-error" aria-live="polite">
        {props.error}
      </p>
    </div>
  );
}
