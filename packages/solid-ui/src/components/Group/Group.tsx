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

export interface GroupProps extends BaseProps {
  children?: JSX.Element;
  justify?: JustifyContent;
  align?: AlignItems;
  /** A spacing token (xs–xl), a number of px, or any CSS length. Default "sm". */
  gap?: SizeProp;
  wrap?: boolean;
  /** Children share the width equally. */
  grow?: boolean;
  ref?: HTMLDivElement | ((el: HTMLDivElement) => void);
}

/** Lays children out in a row. */
export function Group(props: GroupProps) {
  return (
    <div
      ref={props.ref}
      class={cx("bx-Group", props.class)}
      data-grow={props.grow ? "" : undefined}
      style={mergeStyle(props.style, {
        gap: resolveSize(props.gap ?? "sm"),
        "justify-content": props.justify,
        "align-items": props.align,
        "flex-wrap": props.wrap ? "wrap" : undefined
      })}
    >
      {props.children}
    </div>
  );
}
