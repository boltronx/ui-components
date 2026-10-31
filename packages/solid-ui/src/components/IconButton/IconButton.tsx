import {
  createEffect,
  createSignal,
  createUniqueId,
  type JSX,
  onCleanup,
  Show,
  splitProps
} from "solid-js";

import { type BaseProps, cx } from "../../utils/style";
import { FloatingPanel } from "../FloatingPanel/FloatingPanel";

type NativeButtonProps = Omit<
  JSX.ButtonHTMLAttributes<HTMLButtonElement>,
  "class" | "style" | "ref" | "children"
>;

export interface IconButtonProps extends NativeButtonProps, BaseProps {
  children?: JSX.Element;
  color?: "default" | "primary" | "danger";
  bordered?: boolean;
  /** Shown above the button on hover and keyboard focus; also its accessible name. */
  tooltip?: string;
  autoFocus?: boolean;
  ref?: (el: HTMLButtonElement) => void;
}

export function IconButton(props: IconButtonProps) {
  const [local, others] = splitProps(props, [
    "children",
    "class",
    "style",
    "color",
    "bordered",
    "tooltip",
    "autoFocus",
    "type",
    "ref"
  ]);
  const tooltipId = `bx-tooltip-${createUniqueId()}`;
  const [hovered, setHovered] = createSignal(false);
  const [focused, setFocused] = createSignal(false);
  const [dismissed, setDismissed] = createSignal(false);

  // Escape hides a showing tooltip until the pointer leaves or focus moves (WCAG 1.4.13). It is
  // handled first, so the same Escape does not also close a modal or menu behind the button.
  createEffect(() => {
    if (!local.tooltip || dismissed() || !(hovered() || focused())) return;
    const dismissOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      event.preventDefault();
      setDismissed(true);
    };
    document.addEventListener("keydown", dismissOnEscape);
    onCleanup(() => document.removeEventListener("keydown", dismissOnEscape));
  });

  const reset = () => {
    if (!hovered() && !focused()) setDismissed(false);
  };

  // Shown on mouse hover (not a tap) and on keyboard focus, until Escape dismisses it.
  const showTooltip = () => !!local.tooltip && !dismissed() && (hovered() || focused());
  let buttonRef: HTMLButtonElement | undefined;

  const button = () => (
    <button
      {...others}
      ref={el => {
        buttonRef = el;
        if (local.autoFocus) queueMicrotask(() => el.focus());
        local.ref?.(el);
      }}
      type={local.type ?? "button"}
      class={cx("bx-IconButton", local.class)}
      style={local.style}
      data-color={local.color ?? "default"}
      data-bordered={local.bordered ? "" : undefined}
      aria-label={others["aria-label"] ?? local.tooltip}
      // The tooltip already names the button; it only describes it when aria-label names it, and
      // then joins any description the caller gave.
      aria-describedby={
        cx(
          others["aria-describedby"],
          local.tooltip && others["aria-label"] ? tooltipId : undefined
        ) || undefined
      }
    >
      {local.children}
    </button>
  );

  return (
    <Show when={local.tooltip} fallback={button()}>
      <span
        class="bx-IconButton-wrapper"
        data-tooltip-dismissed={dismissed() ? "" : undefined}
        onPointerEnter={event => event.pointerType === "mouse" && setHovered(true)}
        onPointerLeave={() => {
          setHovered(false);
          reset();
        }}
        onFocusIn={event => setFocused((event.target as HTMLElement).matches(":focus-visible"))}
        onFocusOut={() => {
          setFocused(false);
          reset();
        }}
      >
        {button()}
        {/* What screen readers read; it stays next to the button so aria-describedby can point at it. */}
        <span id={tooltipId} role="tooltip" class="bx-visually-hidden">
          {local.tooltip}
        </span>
        {/*
          What is seen, portaled to <body>: a Card, Table or ScrollArea that clips its overflow
          can't cut it off, and it flips below the button when there's no room above.
        */}
        <FloatingPanel
          open={showTooltip()}
          target={() => buttonRef}
          position="top"
          gap={6}
          exitDuration={140}
          class="bx-IconButton-tooltip"
        >
          <span aria-hidden="true">{local.tooltip}</span>
        </FloatingPanel>
      </span>
    </Show>
  );
}
