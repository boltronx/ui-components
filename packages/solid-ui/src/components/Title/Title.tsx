import { type JSX, splitProps } from "solid-js";
import { Dynamic } from "solid-js/web";

import { type BaseProps, cx, mergeStyle } from "../../utils/style";
import { resolveTextColor, type TextColor } from "../Text/Text";

export type TitleOrder = 1 | 2 | 3 | 4 | 5 | 6;

export interface TitleProps
  extends Omit<JSX.HTMLAttributes<HTMLHeadingElement>, "class" | "style">, BaseProps {
  children?: JSX.Element;
  /** Heading level: renders <h1>–<h6>. Default 1. */
  order?: TitleOrder;
  /** Looks like this level while keeping `order` for the document outline. */
  size?: TitleOrder;
  /** A token name (dimmed, primary, danger, success, warning) or any CSS color. */
  c?: TextColor;
  align?: "left" | "center" | "right" | "start" | "end";
}

export function Title(props: TitleProps) {
  const [local, others] = splitProps(props, [
    "children",
    "class",
    "style",
    "order",
    "size",
    "c",
    "align"
  ]);
  const order = () => local.order ?? 1;

  return (
    <Dynamic
      {...others}
      component={`h${order()}`}
      class={cx("bx-Title", local.class)}
      data-order={local.size ?? order()}
      style={mergeStyle(local.style, {
        color: resolveTextColor(local.c),
        "text-align": local.align
      })}
    >
      {local.children}
    </Dynamic>
  );
}
