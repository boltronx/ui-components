import { type JSX, Show } from "solid-js";

import { type BaseProps, cx } from "../../utils/style";

export interface CodeProps extends BaseProps {
  children?: JSX.Element;
  /** Renders a scrollable <pre> block instead of inline code. */
  block?: boolean;
}

export function Code(props: CodeProps) {
  return (
    <Show
      when={props.block}
      fallback={
        <code class={cx("bx-Code", props.class)} style={props.style}>
          {props.children}
        </code>
      }
    >
      <pre class={cx("bx-Code", props.class)} style={props.style} data-block="">
        <code>{props.children}</code>
      </pre>
    </Show>
  );
}
