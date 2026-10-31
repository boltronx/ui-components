import type { JSX } from "solid-js";
import {
  createEffect,
  createMemo,
  createSignal,
  createUniqueId,
  onCleanup,
  splitProps,
  untrack
} from "solid-js";

import {
  afterFormReset,
  isCompositionKey,
  keepControlledOnReset,
  onFormReset,
  submitImplicitly
} from "../../utils/form";
import type { BaseProps } from "../../utils/style";
import { describedBy, Field, type FieldOwnProps } from "../Field/Field";
import { useReadOnly } from "../ReadOnly/ReadOnly";

type NativeTextareaProps = Omit<
  JSX.TextareaHTMLAttributes<HTMLTextAreaElement>,
  "class" | "style" | "value" | "defaultValue" | "ref" | "children" | "readOnly" | "readonly"
>;

export interface TextareaProps extends NativeTextareaProps, FieldOwnProps, BaseProps {
  /** Controlled value. The parent owns it; a form reset leaves it in place. */
  value?: string;
  /** Uncontrolled starting value; a form reset restores it. */
  defaultValue?: string;
  readOnly?: boolean;
  autoFocus?: boolean;
  resize?: "none" | "both" | "horizontal" | "vertical";
  showCount?: boolean;
  /** Grows and shrinks with its content, starting at one row unless `rows` is given. */
  autoSize?: boolean;
  /** With `autoSize`, stops growing at this many rows and scrolls past it. */
  maxRows?: number;
  /** Enter submits the enclosing form, as in an input; Shift+Enter still adds a new line. */
  submitOnEnter?: boolean;
  ref?: (el: HTMLTextAreaElement) => void;
}

export function Textarea(props: TextareaProps) {
  const [local, field, rest] = splitProps(
    props,
    [
      "class",
      "style",
      "id",
      "value",
      "defaultValue",
      "readOnly",
      "autoFocus",
      "resize",
      "showCount",
      "autoSize",
      "maxRows",
      "submitOnEnter",
      "ref"
    ],
    ["label", "description", "error"]
  );

  const generatedId = createUniqueId();
  const textareaId = () => local.id ?? `bx-textarea-${generatedId}`;
  const isReadOnly = useReadOnly(() => local.readOnly === true);
  const [characterCount, setCharacterCount] = createSignal(
    untrack(() => String(local.value ?? local.defaultValue ?? "").length)
  );
  /** "N characters left" once within a tenth of maxLength (at least 10), else nothing. */
  const remainingAnnouncement = () => {
    if (rest.maxLength === undefined) return "";
    const max = Number(rest.maxLength);
    const left = Math.max(0, max - characterCount());
    if (left > Math.max(10, max / 10)) return "";
    return `${left} ${left === 1 ? "character" : "characters"} left`;
  };
  // Read once: the text is only the starting point, so later changes to it (or every keystroke
  // of a controlled value) would rewrite the DOM and move what a reset restores.
  const initialText = untrack(() => local.value ?? local.defaultValue);
  let textarea: HTMLTextAreaElement | undefined;
  // What the native listeners and the resize observer read, as memos: they have no reactive owner,
  // and reading a prop written as a condition (`maxRows={a() ? 4 : 8}`) there would make Solid
  // create a computation that is never disposed.
  const autoSize = createMemo(() => local.autoSize === true);
  const maxRows = createMemo(() => local.maxRows);
  const submitOnEnter = createMemo(() => local.submitOnEnter === true);

  /** Sizes the box to its content, borders included since the box is border-box. */
  function fit() {
    const el = textarea;
    if (!el || !autoSize()) return;
    el.style.height = "auto";
    let height = el.scrollHeight + el.offsetHeight - el.clientHeight;
    let overflow = false;
    if (maxRows()) {
      // With height auto the box is exactly `rows` tall, so borrowing maxRows measures the cap in
      // the box's own font and padding.
      const rows = el.rows;
      el.rows = maxRows()!;
      const max = el.offsetHeight;
      el.rows = rows;
      overflow = height > max;
      if (overflow) height = max;
    }
    el.style.overflowY = overflow ? "auto" : "hidden";
    el.style.height = `${height}px`;
  }

  createEffect(() => {
    if (local.value !== undefined) setCharacterCount(local.value.length);
    fit();
  });

  keepControlledOnReset(
    () => textarea,
    () => local.value
  );
  onFormReset(
    () => textarea,
    () =>
      afterFormReset(() => {
        setCharacterCount(textarea?.value.length ?? 0);
        fit();
      })
  );

  return (
    <Field
      id={textareaId()}
      label={field.label}
      description={field.description}
      error={field.error}
      required={rest.required}
      class={local.class}
      style={local.style}
    >
      <textarea
        {...rest}
        ref={el => {
          textarea = el;
          el.addEventListener("input", () => {
            setCharacterCount(el.value.length);
            fit();
          });
          el.addEventListener("keydown", event => {
            // Enter that confirms an IME composition is not a submit.
            if (!submitOnEnter() || event.key !== "Enter" || event.shiftKey) return;
            if (isCompositionKey(event)) return;
            event.preventDefault();
            if (el.form) submitImplicitly(el.form);
          });
          if (local.autoSize) {
            // Wrapping follows the width, which is unknown until the box is laid out and can change
            // with its container, so refit whenever the width changes.
            let width = 0;
            const observer = new ResizeObserver(() => {
              if (el.clientWidth === width) return;
              width = el.clientWidth;
              fit();
            });
            observer.observe(el);
            onCleanup(() => observer.disconnect());
          }
          if (local.autoFocus) queueMicrotask(() => el.focus());
          local.ref?.(el);
        }}
        id={textareaId()}
        class="bx-Input-control bx-Textarea"
        value={local.value ?? undefined}
        // Omitted rather than false: the server writes any readonly attribute, even "false".
        readOnly={isReadOnly() || undefined}
        data-readonly={isReadOnly() ? "" : undefined}
        aria-invalid={field.error ? true : undefined}
        aria-describedby={describedBy(textareaId(), field)}
        rows={rest.rows ?? (local.autoSize ? 1 : undefined)}
        style={{ resize: local.resize ?? "none" }}
      >
        {/*
          A textarea's text is its default: it fills an untouched box, is what a reset restores,
          and, unlike a ref, is in the server's HTML.
        */}
        {initialText}
      </textarea>
      {local.showCount ? (
        <>
          {/* Read out only near the limit, not as "12 slash 200" on every keystroke. */}
          <div class="bx-Textarea-count" aria-hidden="true">
            {characterCount()}
            {rest.maxLength !== undefined ? `/${rest.maxLength}` : null}
          </div>
          <span class="bx-visually-hidden" aria-live="polite">
            {remainingAnnouncement()}
          </span>
        </>
      ) : null}
    </Field>
  );
}
