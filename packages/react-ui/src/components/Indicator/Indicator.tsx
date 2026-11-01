import type { ReactNode } from "react";

import { type BaseProps, cx } from "../../utils/style";

export interface IndicatorProps extends BaseProps {
  children?: ReactNode;
  /** Badge content; a number above `maxValue` shows as "99+". Hidden when undefined. */
  label?: ReactNode;
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
  const maxValue = props.maxValue ?? 99;
  const displayLabel =
    typeof props.label === "number" && props.label > maxValue ? `${maxValue}+` : props.label;

  return (
    <div className={cx("bx-Indicator", props.className)} style={props.style}>
      {props.children}
      <div
        className="bx-Indicator-badge"
        data-position={props.position ?? "top-right"}
        style={props.color ? { background: props.color } : undefined}
        hidden={displayLabel === undefined}
      >
        <span aria-hidden={props["aria-label"] ? "true" : undefined}>{displayLabel}</span>
        {props["aria-label"] && <span className="bx-visually-hidden">{props["aria-label"]}</span>}
      </div>
    </div>
  );
}
