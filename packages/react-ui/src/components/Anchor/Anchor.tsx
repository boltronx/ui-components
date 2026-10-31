import type { AnchorHTMLAttributes, ElementType, ReactNode, Ref } from "react";

import { type BaseProps, cx } from "../../utils/style";

export interface AnchorProps
  extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "className" | "style">, BaseProps {
  children?: ReactNode;
  /** Element or component to render, e.g. Next.js `Link`. Default "a". */
  component?: ElementType;
  /** Default "hover". */
  underline?: "hover" | "always" | "never";
  ref?: Ref<HTMLAnchorElement>;
}

/** A styled link. Pass `component={Link}` to keep client-side routing. */
export function Anchor({ children, component, className, underline, ...others }: AnchorProps) {
  const Component = component ?? "a";
  return (
    <Component
      {...others}
      className={cx("bx-Anchor", className)}
      data-underline={underline ?? "hover"}
    >
      {children}
    </Component>
  );
}
