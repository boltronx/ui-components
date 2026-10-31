import type { JSX } from "solid-js";
import { Show } from "solid-js";

import { type BaseProps, cx } from "../../utils/style";

export interface IndicatorProps extends BaseProps {
  children?: JSX.Element;
  /** Badge content; a number above `maxValue` shows as "99+". Hidden when undefined. */
  label?: JSX.Element | number;
  /** Badge color. Default the danger color. */
  color?: string;
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  maxValue?: number;
  /**
   * What the badge means, read instead of its bare content, e.g. "3 unread notifications".
   * Without it a screen reader hears only "3".
   */
  "aria-label"?: string;
}

export function Indicator(props: IndicatorProps) {
  const displayLabel = () => {
    const maxValue = props.maxValue ?? 99;
    if (typeof props.label === "number") {
      return props.label > maxValue ? `${maxValue}+` : props.label;
    }
    return props.label;
  };

  return (
    <div class={cx("bx-Indicator", props.class)} style={props.style}>
      {props.children}
      <div
        class="bx-Indicator-badge"
        data-position={props.position ?? "top-right"}
        style={props.color ? { background: props.color } : undefined}
        hidden={displayLabel() === undefined}
      >
        <span aria-hidden={props["aria-label"] ? "true" : undefined}>{displayLabel()}</span>
        <Show when={props["aria-label"]}>
          <span class="bx-visually-hidden">{props["aria-label"]}</span>
        </Show>
      </div>
    </div>
  );
}
