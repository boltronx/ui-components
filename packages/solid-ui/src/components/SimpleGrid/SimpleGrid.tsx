import type { JSX } from "solid-js";

import { type BaseProps, cx, mergeStyle, resolveSize, type SizeProp } from "../../utils/style";

export interface SimpleGridProps extends BaseProps {
  children?: JSX.Element;
  /**
   * The narrowest a column gets before the grid drops to fewer columns. The grid fits as many as
   * the width allows, so it is responsive without breakpoints. Default "16rem".
   */
  minChildWidth?: string;
  /** A spacing token (xs–xl), a number of px, or any CSS length. Default "md". */
  gap?: SizeProp;
  ref?: HTMLDivElement | ((el: HTMLDivElement) => void);
}

export function SimpleGrid(props: SimpleGridProps) {
  return (
    <div
      ref={props.ref}
      class={cx("bx-SimpleGrid", props.class)}
      style={mergeStyle(props.style, {
        "--bx-grid-min": props.minChildWidth ?? "16rem",
        gap: resolveSize(props.gap ?? "md")
      })}
    >
      {props.children}
    </div>
  );
}
