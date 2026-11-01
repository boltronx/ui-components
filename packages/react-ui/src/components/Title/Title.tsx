import type { HTMLAttributes, ReactNode, Ref } from "react";

import { type BaseProps, cx, mergeStyle } from "../../utils/style";
import { resolveTextColor, type TextColor } from "../Text/Text";

export type TitleOrder = 1 | 2 | 3 | 4 | 5 | 6;

export interface TitleProps
  extends Omit<HTMLAttributes<HTMLHeadingElement>, "className" | "style" | "color">, BaseProps {
  children?: ReactNode;
  /** Heading level: renders <h1>–<h6>. Default 1. */
  order?: TitleOrder;
  /** Looks like this level while keeping `order` for the document outline. */
  size?: TitleOrder;
  /** A token name (dimmed, primary, danger, success, warning) or any CSS color. */
  c?: TextColor;
  align?: "left" | "center" | "right" | "start" | "end";
  ref?: Ref<HTMLHeadingElement>;
}

export function Title({
  children,
  className,
  style,
  order,
  size,
  c,
  align,
  ...others
}: TitleProps) {
  const level = order ?? 1;
  const Heading = `h${level}` as const;
  return (
    <Heading
      {...others}
      className={cx("bx-Title", className)}
      data-order={size ?? level}
      style={mergeStyle(style, { color: resolveTextColor(c), textAlign: align })}
    >
      {children}
    </Heading>
  );
}
