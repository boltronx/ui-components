import type { ReactNode, Ref } from "react";

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
  children?: ReactNode;
  justify?: JustifyContent;
  align?: AlignItems;
  /** A spacing token (xs–xl), a number of px, or any CSS length. Default "sm". */
  gap?: SizeProp;
  wrap?: boolean;
  /** Children share the width equally. */
  grow?: boolean;
  ref?: Ref<HTMLDivElement>;
}

/** Lays children out in a row. */
export function Group(props: GroupProps) {
  return (
    <div
      ref={props.ref}
      className={cx("bx-Group", props.className)}
      data-grow={props.grow ? "" : undefined}
      style={mergeStyle(props.style, {
        gap: resolveSize(props.gap ?? "sm"),
        justifyContent: props.justify,
        alignItems: props.align,
        flexWrap: props.wrap ? "wrap" : undefined
      })}
    >
      {props.children}
    </div>
  );
}
