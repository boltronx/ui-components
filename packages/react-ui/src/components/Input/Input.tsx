"use client";

import { type InputHTMLAttributes, type ReactNode, type Ref, useId, useRef } from "react";

import { useKeepControlledOnReset } from "../../utils/form";
import { useMergedRefs } from "../../utils/refs";
import { type BaseProps, type StyleProp } from "../../utils/style";
import { describedBy, Field, type FieldOwnProps } from "../Field/Field";
import { useReadOnly } from "../ReadOnly/ReadOnly";

/** Content beside the input. Pass `{ node, pointerEvents: "all" }` for something clickable. */
export type InputSection = ReactNode | { pointerEvents: "none" | "all"; node: ReactNode };

type NativeInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "className" | "style" | "value" | "defaultValue" | "children" | "readOnly"
>;

export interface InputProps extends NativeInputProps, FieldOwnProps, BaseProps {
  /** Controlled value. The parent owns it; a form reset leaves it in place. */
  value?: string | number;
  /** Uncontrolled starting value; a form reset restores it. */
  defaultValue?: string | number;
  readOnly?: boolean;
  leftSection?: InputSection;
  rightSection?: InputSection;
  inputStyle?: StyleProp;
  inputClassName?: string;
  ref?: Ref<HTMLInputElement>;
}

export function resolveSection(section: InputSection | undefined) {
  if (section && typeof section === "object" && !Array.isArray(section) && "node" in section) {
    return section as { pointerEvents: "none" | "all"; node: ReactNode };
  }
  return { node: section as ReactNode, pointerEvents: "none" as const };
}

export function Input({
  className,
  style,
  id,
  value,
  readOnly,
  leftSection,
  rightSection,
  inputStyle,
  inputClassName,
  ref,
  label,
  description,
  error,
  ...inputProps
}: InputProps) {
  const generatedId = useId();
  const inputId = id ?? `bx-input-${generatedId}`;
  const left = resolveSection(leftSection);
  const right = resolveSection(rightSection);
  const isReadOnly = useReadOnly(readOnly);
  const input = useRef<HTMLInputElement>(null);
  const inputRef = useMergedRefs(input, ref);

  useKeepControlledOnReset(input, value);

  return (
    <Field
      id={inputId}
      label={label}
      description={description}
      error={error}
      required={inputProps.required}
      className={className}
      style={style}
    >
      <div
        className="bx-Input"
        data-with-left={left.node ? "" : undefined}
        data-with-right={right.node ? "" : undefined}
        data-disabled={inputProps.disabled ? "" : undefined}
      >
        {left.node ? (
          <span
            className="bx-Input-section"
            data-position="left"
            style={{ pointerEvents: left.pointerEvents }}
          >
            {left.node}
          </span>
        ) : null}
        <input
          type="text"
          {...inputProps}
          ref={inputRef}
          id={inputId}
          className={inputClassName ? `bx-Input-control ${inputClassName}` : "bx-Input-control"}
          style={inputStyle}
          value={value}
          readOnly={isReadOnly}
          data-readonly={isReadOnly ? "" : undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(inputId, { description, error })}
        />
        {right.node ? (
          <span
            className="bx-Input-section"
            data-position="right"
            style={{ pointerEvents: right.pointerEvents }}
          >
            {right.node}
          </span>
        ) : null}
      </div>
    </Field>
  );
}
