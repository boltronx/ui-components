import type { JSX } from "solid-js";

import { type BaseProps, cx, mergeStyle, resolveSize, type SizeProp } from "../../utils/style";

export interface CardProps extends BaseProps {
  children?: JSX.Element;
  /** A spacing token (xs–xl), a number of px, or any CSS length. Default "md". */
  padding?: SizeProp;
  shadow?: "none" | "sm" | "md";
  /** Default true. */
  bordered?: boolean;
  ref?: HTMLDivElement | ((el: HTMLDivElement) => void);
}

export function Card(props: CardProps) {
  return (
    <div
      ref={props.ref}
      class={cx("bx-Card", props.class)}
      data-shadow={props.shadow && props.shadow !== "none" ? props.shadow : undefined}
      data-borderless={props.bordered === false ? "" : undefined}
      style={mergeStyle(props.style, { padding: resolveSize(props.padding ?? "md") })}
    >
      {props.children}
    </div>
  );
}
