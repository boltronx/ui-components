import { type JSX, splitProps, type ValidComponent } from "solid-js";
import { Dynamic } from "solid-js/web";

import { type BaseProps, cx } from "../../utils/style";

export interface AnchorProps
  extends Omit<JSX.AnchorHTMLAttributes<HTMLAnchorElement>, "class" | "style">, BaseProps {
  children?: JSX.Element;
  /** Element or component to render, e.g. a router's `A`. Default "a". */
  component?: ValidComponent;
  /** Default "hover". */
  underline?: "hover" | "always" | "never";
}

/** A styled link. Pass `component={A}` to keep client-side routing. */
export function Anchor(props: AnchorProps) {
  const [local, others] = splitProps(props, ["children", "component", "class", "underline"]);

  return (
    <Dynamic
      {...others}
      component={local.component ?? "a"}
      class={cx("bx-Anchor", local.class)}
      data-underline={local.underline ?? "hover"}
    >
      {local.children}
    </Dynamic>
  );
}
