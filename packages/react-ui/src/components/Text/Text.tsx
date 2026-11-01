import type { ElementType, HTMLAttributes, ReactNode, Ref } from "react";

import { type BaseProps, cx, mergeStyle, type Size } from "../../utils/style";

export type TextColor = "dimmed" | "primary" | "danger" | "success" | "warning" | (string & {});

const COLOR_TOKENS: Record<string, string> = {
  dimmed: "var(--bx-text-dimmed)",
  primary: "var(--bx-primary)",
  danger: "var(--bx-danger)",
  success: "var(--bx-success)",
  warning: "var(--bx-warning)"
};

/** A token name (dimmed, primary, danger, success, warning) or any CSS color. */
export function resolveTextColor(color: TextColor | undefined): string | undefined {
  return color === undefined ? undefined : (COLOR_TOKENS[color] ?? color);
}

export interface TextProps
  extends Omit<HTMLAttributes<HTMLElement>, "className" | "style" | "color">, BaseProps {
  children?: ReactNode;
  /** Element to render. Default "p"; use "span" for inline text. */
  component?: ElementType;
  size?: Size;
  /** A token name (dimmed, primary, danger, success, warning) or any CSS color. */
  c?: TextColor;
  /** Font weight. */
  fw?: number | "normal" | "bold";
  align?: "left" | "center" | "right" | "start" | "end";
  /** Cuts overflowing text to one line with an ellipsis. */
  truncate?: boolean;
  ref?: Ref<HTMLElement>;
}

export function Text({
  children,
  component,
  className,
  style,
  size,
  c,
  fw,
  align,
  truncate,
  ...others
}: TextProps) {
  const Component = component ?? "p";
  return (
    <Component
      {...others}
      className={cx("bx-Text", className)}
      data-size={size}
      data-truncate={truncate ? "" : undefined}
      style={mergeStyle(style, {
        color: resolveTextColor(c),
        fontWeight: fw === undefined ? undefined : String(fw),
        textAlign: align
      })}
    >
      {children}
    </Component>
  );
}
