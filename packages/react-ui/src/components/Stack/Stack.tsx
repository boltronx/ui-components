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

export interface StackProps extends BaseProps {
  children?: ReactNode;
  justify?: JustifyContent;
  align?: AlignItems;
  /** A spacing token (xs–xl), a number of px, or any CSS length. Default "sm". */
  gap?: SizeProp;
  /** Children share the height equally. */
  grow?: boolean;
  ref?: Ref<HTMLDivElement>;
}

/** Lays children out in a column. */
export function Stack(props: StackProps) {
  return (
    <div
      ref={props.ref}
      className={cx("bx-Stack", props.className)}
      data-grow={props.grow ? "" : undefined}
      style={mergeStyle(props.style, {
        gap: resolveSize(props.gap ?? "sm"),
        justifyContent: props.justify,
        alignItems: props.align
      })}
    >
      {props.children}
    </div>
  );
}
