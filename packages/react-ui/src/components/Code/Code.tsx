import type { ReactNode } from "react";

import { type BaseProps, cx } from "../../utils/style";

export interface CodeProps extends BaseProps {
  children?: ReactNode;
  /** Renders a scrollable <pre> block instead of inline code. */
  block?: boolean;
}

export function Code(props: CodeProps) {
  if (!props.block) {
    return (
      <code className={cx("bx-Code", props.className)} style={props.style}>
        {props.children}
      </code>
    );
  }
  return (
    <pre className={cx("bx-Code", props.className)} style={props.style} data-block="">
      <code>{props.children}</code>
    </pre>
  );
}
