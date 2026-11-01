"use client";

import {
  type ButtonHTMLAttributes,
  type ReactNode,
  type Ref,
  useEffect,
  useId,
  useRef,
  useState
} from "react";

import { useMergedRefs } from "../../utils/refs";
import { type BaseProps, cx } from "../../utils/style";
import { FloatingPanel } from "../FloatingPanel/FloatingPanel";

type NativeButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "className" | "style" | "children" | "color"
>;

export interface IconButtonProps extends NativeButtonProps, BaseProps {
  children?: ReactNode;
  color?: "default" | "primary" | "danger";
  bordered?: boolean;
  /** Shown above the button on hover and keyboard focus; also its accessible name. */
  tooltip?: string;
  ref?: Ref<HTMLButtonElement>;
}

export function IconButton({
  children,
  className,
  style,
  color,
  bordered,
  tooltip,
  type,
  ref,
  ...others
}: IconButtonProps) {
  const tooltipId = `bx-tooltip-${useId()}`;
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const mergedRef = useMergedRefs(buttonRef, ref);

  // Shown on mouse hover (not a tap) and on keyboard focus, until Escape dismisses it.
  const showTooltip = !!tooltip && !dismissed && (hovered || focused);

  // Escape hides a showing tooltip until the pointer leaves or focus moves (WCAG 1.4.13). It is
  // handled in the capture phase, so the same Escape does not also close a modal or menu behind
  // the button.
  useEffect(() => {
    if (!showTooltip) return;
    const dismissOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      event.preventDefault();
      setDismissed(true);
    };
    document.addEventListener("keydown", dismissOnEscape, true);
    return () => document.removeEventListener("keydown", dismissOnEscape, true);
  }, [showTooltip]);

  const button = (
    <button
      {...others}
      ref={mergedRef}
      type={type ?? "button"}
      className={cx("bx-IconButton", className)}
      style={style}
      data-color={color ?? "default"}
      data-bordered={bordered ? "" : undefined}
      aria-label={others["aria-label"] ?? tooltip}
      // The tooltip already names the button; it only describes it when aria-label names it,
      // alongside any description the caller gave.
      aria-describedby={
        cx(others["aria-describedby"], tooltip && others["aria-label"] && tooltipId) || undefined
      }
    >
      {children}
    </button>
  );

  if (!tooltip) return button;
  return (
    <span
      className="bx-IconButton-wrapper"
      data-tooltip-dismissed={dismissed ? "" : undefined}
      onPointerEnter={event => event.pointerType === "mouse" && setHovered(true)}
      onPointerLeave={() => {
        setHovered(false);
        if (!focused) setDismissed(false);
      }}
      onFocus={event => setFocused((event.target as HTMLElement).matches(":focus-visible"))}
      onBlur={() => {
        setFocused(false);
        if (!hovered) setDismissed(false);
      }}
    >
      {button}
      {/* What screen readers read; it stays next to the button so aria-describedby can point at it. */}
      <span id={tooltipId} role="tooltip" className="bx-visually-hidden">
        {tooltip}
      </span>
      {/*
        What is seen, portaled to <body>: a Card, Table or ScrollArea that clips its overflow
        can't cut it off, and it flips below the button when there's no room above.
      */}
      <FloatingPanel
        open={showTooltip}
        target={buttonRef}
        position="top"
        gap={6}
        exitDuration={140}
        className="bx-IconButton-tooltip"
      >
        <span aria-hidden="true">{tooltip}</span>
      </FloatingPanel>
    </span>
  );
}
