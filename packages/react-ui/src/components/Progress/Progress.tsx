import { type BaseProps, cx, mergeStyle } from "../../utils/style";

export interface ProgressProps extends BaseProps {
  value: number;
  /** Default 100. */
  max?: number;
  /** Shown on the bar and used as its accessible name. */
  label?: string;
  /** Accessible name for a bar without a visible label, e.g. "Upload progress". */
  "aria-label"?: string;
  /** Bar color. Default the primary color. */
  color?: string;
  striped?: boolean;
  /** Moving stripes; implies `striped`. */
  animated?: boolean;
  size?: "xs" | "sm" | "md" | "lg";
}

export function Progress(props: ProgressProps) {
  const max = props.max ?? 100;
  const value = Math.min(Math.max(props.value, 0), max);
  const percentage = max > 0 ? (value / max) * 100 : 0;

  return (
    <div
      className={cx("bx-Progress", props.className)}
      style={mergeStyle(props.style, { "--bx-progress-percent": `${percentage}%` })}
      data-size={props.size ?? "md"}
      data-striped={props.striped || props.animated ? "" : undefined}
      data-animated={props.animated ? "" : undefined}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={props.label ?? props["aria-label"]}
    >
      <div
        className="bx-Progress-bar"
        style={{ width: `${percentage}%`, backgroundColor: props.color }}
      />
      {props.label ? (
        <>
          {/*
            Drawn twice: in text color over the empty track, and in the bar's contrast color
            clipped to the filled part, so every letter is readable at any value.
          */}
          <span className="bx-Progress-label">{props.label}</span>
          <span className="bx-Progress-label" data-filled="" aria-hidden="true">
            {props.label}
          </span>
        </>
      ) : null}
    </div>
  );
}
