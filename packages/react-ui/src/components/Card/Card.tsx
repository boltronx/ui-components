import type { ReactNode, Ref } from "react";

import { type BaseProps, cx, mergeStyle, resolveSize, type SizeProp } from "../../utils/style";

export interface CardProps extends BaseProps {
  children?: ReactNode;
  /** A spacing token (xs–xl), a number of px, or any CSS length. Default "md". */
  padding?: SizeProp;
  shadow?: "none" | "sm" | "md";
  /** Default true. */
  bordered?: boolean;
  ref?: Ref<HTMLDivElement>;
}

export function Card(props: CardProps) {
  return (
    <div
      ref={props.ref}
      className={cx("bx-Card", props.className)}
      data-shadow={props.shadow && props.shadow !== "none" ? props.shadow : undefined}
      data-borderless={props.bordered === false ? "" : undefined}
      style={mergeStyle(props.style, { padding: resolveSize(props.padding ?? "md") })}
    >
      {props.children}
    </div>
  );
}
