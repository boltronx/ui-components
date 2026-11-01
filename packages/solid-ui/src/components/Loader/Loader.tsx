import { Index, Show } from "solid-js";

import { type BaseProps, cx, mergeStyle } from "../../utils/style";

export interface LoaderProps extends BaseProps {
  size?: "xs" | "sm" | "md" | "lg";
  /** Any CSS color. Default the primary color. */
  color?: string;
  variant?: "oval" | "dots" | "bars";
  /** Accessible name. Default "Loading". */
  label?: string;
}

export function Loader(props: LoaderProps) {
  const variant = () => props.variant ?? "oval";

  return (
    <span
      class={cx("bx-Loader", props.class)}
      style={mergeStyle(props.style, { color: props.color })}
      data-variant={variant()}
      data-size={props.size ?? "sm"}
      role="status"
      aria-label={props.label ?? "Loading"}
    >
      <Show when={variant() !== "oval"} fallback={<span class="bx-Loader-oval" />}>
        <Index each={[0, 1, 2]}>{() => <span class="bx-Loader-item" />}</Index>
      </Show>
    </span>
  );
}
