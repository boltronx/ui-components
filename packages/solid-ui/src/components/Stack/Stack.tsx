import type { JSX } from "solid-js";

import {
  type AlignItems,
  type BaseProps,
  cx,
  type JustifyContent,
  mergeStyle,
  resolveSize,
  type SizeProp
} from "../../utils/style";

export interface StackProps extends BaseProps {
  children?: JSX.Element;
  justify?: JustifyContent;
  align?: AlignItems;
  /** A spacing token (xs–xl), a number of px, or any CSS length. Default "sm". */
  gap?: SizeProp;
  /** Children share the height equally. */
  grow?: boolean;
  ref?: HTMLDivElement | ((el: HTMLDivElement) => void);
}

/** Lays children out in a column. */
export function Stack(props: StackProps) {
  return (
    <div
      ref={props.ref}
      class={cx("bx-Stack", props.class)}
      data-grow={props.grow ? "" : undefined}
      style={mergeStyle(props.style, {
        gap: resolveSize(props.gap ?? "sm"),
        "justify-content": props.justify,
        "align-items": props.align
      })}
    >
      {props.children}
    </div>
  );
}
