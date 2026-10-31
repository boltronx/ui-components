"use client";

import {
  type Ref,
  type TextareaHTMLAttributes,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState
} from "react";

import {
  afterFormReset,
  isCompositionKey,
  submitImplicitly,
  useFormReset,
  useKeepControlledOnReset,
  useLatest
} from "../../utils/form";
import { useMergedRefs } from "../../utils/refs";
import type { BaseProps } from "../../utils/style";
import { describedBy, Field, type FieldOwnProps } from "../Field/Field";
import { useReadOnly } from "../ReadOnly/ReadOnly";

type NativeTextareaProps = Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  "className" | "style" | "value" | "defaultValue" | "children" | "readOnly"
>;

export interface TextareaProps extends NativeTextareaProps, FieldOwnProps, BaseProps {
  /** Controlled value. The parent owns it; a form reset leaves it in place. */
  value?: string;
  /** Uncontrolled starting value; a form reset restores it. */
  defaultValue?: string;
  readOnly?: boolean;
  resize?: "none" | "both" | "horizontal" | "vertical";
  showCount?: boolean;
  /** Grows and shrinks with its content, starting at one row unless `rows` is given. */
  autoSize?: boolean;
  /** With `autoSize`, stops growing at this many rows and scrolls past it. */
  maxRows?: number;
  /** Enter submits the enclosing form, as in an input; Shift+Enter still adds a new line. */
  submitOnEnter?: boolean;
  ref?: Ref<HTMLTextAreaElement>;
}

export function Textarea({
  className,
  style,
  id,
  value,
  readOnly,
  resize,
  showCount,
  autoSize,
  maxRows,
  submitOnEnter,
  ref,
  label,
  description,
  error,
  onChange,
  onKeyDown,
  ...rest
}: TextareaProps) {
  const generatedId = useId();
  const textareaId = id ?? `bx-textarea-${generatedId}`;
  const isReadOnly = useReadOnly(readOnly);
  const [typedCount, setCharacterCount] = useState(
    () => String(value ?? rest.defaultValue ?? "").length
  );
  const characterCount = value !== undefined ? value.length : typedCount;
  /** "N characters left" once within a tenth of maxLength (at least 10), else nothing. */
  const remainingAnnouncement = (() => {
    if (rest.maxLength === undefined) return "";
    const max = Number(rest.maxLength);
    const left = Math.max(0, max - characterCount);
    if (left > Math.max(10, max / 10)) return "";
    return `${left} ${left === 1 ? "character" : "characters"} left`;
  })();
  const textarea = useRef<HTMLTextAreaElement>(null);
  const textareaRef = useMergedRefs(textarea, ref);
  const sizing = useLatest({ autoSize, maxRows });

  /** Sizes the box to its content, borders included since the box is border-box. */
  const fit = useCallback(() => {
    const el = textarea.current;
    const { autoSize, maxRows } = sizing.current;
    if (!el || !autoSize) return;
    el.style.height = "auto";
    let height = el.scrollHeight + el.offsetHeight - el.clientHeight;
    let overflow = false;
    if (maxRows) {
      // With height auto the box is exactly `rows` tall, so borrowing maxRows measures the cap in
      // the box's own font and padding.
      const rows = el.rows;
      el.rows = maxRows;
      const max = el.offsetHeight;
      el.rows = rows;
      overflow = height > max;
      if (overflow) height = max;
    }
    el.style.overflowY = overflow ? "auto" : "hidden";
    el.style.height = `${height}px`;
  }, [sizing]);

  useLayoutEffect(fit, [fit, value, autoSize, maxRows]);

  useEffect(() => {
    const el = textarea.current;
    if (!autoSize || !el) return;
    // Wrapping follows the width, which is unknown until the box is laid out and can change
    // with its container, so refit whenever the width changes.
    let width = 0;
    const observer = new ResizeObserver(() => {
      if (el.clientWidth === width) return;
      width = el.clientWidth;
      fit();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [autoSize, fit]);

  useKeepControlledOnReset(textarea, value);
  useFormReset(textarea, () =>
    afterFormReset(() => {
      setCharacterCount(textarea.current?.value.length ?? 0);
      fit();
    })
  );

  return (
    <Field
      id={textareaId}
      label={label}
      description={description}
      error={error}
      required={rest.required}
      className={className}
      style={style}
    >
      <textarea
        {...rest}
        ref={textareaRef}
        id={textareaId}
        className="bx-Input-control bx-Textarea"
        value={value}
        readOnly={isReadOnly}
        data-readonly={isReadOnly ? "" : undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(textareaId, { description, error })}
        rows={rest.rows ?? (autoSize ? 1 : undefined)}
        style={{ resize: resize ?? "none" }}
        onChange={event => {
          onChange?.(event);
          setCharacterCount(event.currentTarget.value.length);
          fit();
        }}
        onKeyDown={event => {
          onKeyDown?.(event);
          // Enter that confirms an IME composition is not a submit.
          if (!submitOnEnter || event.key !== "Enter" || event.shiftKey) return;
          if (isCompositionKey(event.nativeEvent)) return;
          event.preventDefault();
          const form = event.currentTarget.form;
          if (form) submitImplicitly(form);
        }}
      />
      {showCount ? (
        <>
          {/* Read out only near the limit, not as "12 slash 200" on every keystroke. */}
          <div className="bx-Textarea-count" aria-hidden="true">
            {characterCount}
            {rest.maxLength !== undefined ? `/${rest.maxLength}` : null}
          </div>
          <span className="bx-visually-hidden" aria-live="polite">
            {remainingAnnouncement}
          </span>
        </>
      ) : null}
    </Field>
  );
}
