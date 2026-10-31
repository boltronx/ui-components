import { type JSX, splitProps, type ValidComponent } from "solid-js";
import { Dynamic } from "solid-js/web";

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
  extends Omit<JSX.HTMLAttributes<HTMLElement>, "class" | "style">, BaseProps {
  children?: JSX.Element;
  /** Element to render. Default "p"; use "span" for inline text. */
  component?: ValidComponent;
  size?: Size;
  /** A token name (dimmed, primary, danger, success, warning) or any CSS color. */
  c?: TextColor;
  /** Font weight. */
  fw?: number | "normal" | "bold";
  align?: "left" | "center" | "right" | "start" | "end";
  /** Cuts overflowing text to one line with an ellipsis. */
  truncate?: boolean;
}

export function Text(props: TextProps) {
  const [local, others] = splitProps(props, [
    "children",
    "component",
    "class",
    "style",
    "size",
    "c",
    "fw",
    "align",
    "truncate"
  ]);

  return (
    <Dynamic
      {...others}
      component={local.component ?? "p"}
      class={cx("bx-Text", local.class)}
      data-size={local.size}
      data-truncate={local.truncate ? "" : undefined}
      style={mergeStyle(local.style, {
        color: resolveTextColor(local.c),
        "font-weight": local.fw === undefined ? undefined : String(local.fw),
        "text-align": local.align
      })}
    >
      {local.children}
    </Dynamic>
  );
}
