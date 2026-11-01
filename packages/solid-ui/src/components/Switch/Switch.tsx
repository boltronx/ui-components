import { type JSX, splitProps } from "solid-js";

import { type CheckboxBaseProps, CheckboxControl } from "../Checkbox/Checkbox";

export interface SwitchProps extends CheckboxBaseProps {
  /** Default "md". */
  size?: "sm" | "md" | "lg";
  /** Shown inside the track while on, e.g. "ON" or an icon. Keep it to a few characters. */
  onLabel?: JSX.Element;
  /** Shown inside the track while off. */
  offLabel?: JSX.Element;
  /** Drawn on the thumb, e.g. a sun or moon icon. */
  thumbIcon?: JSX.Element;
}

/**
 * An on/off toggle for a setting that applies right away, such as notifications. It is a
 * checkbox underneath, announced as a switch, so it submits like one: `value` (default "on")
 * under `name` while on, nothing while off.
 */
export function Switch(props: SwitchProps) {
  const [local, rest] = splitProps(props, ["size", "onLabel", "offLabel", "thumbIcon"]);
  const withLabels = () => local.onLabel !== undefined || local.offLabel !== undefined;

  return (
    <CheckboxControl
      {...rest}
      variant="switch"
      rootProps={{
        "data-size": local.size ?? "md",
        "data-with-labels": withLabels() ? "" : undefined
      }}
      renderControl={input => (
        // The input sits over the track, invisible, so clicks, focus and forms stay native; the
        // track only draws its state, which CSS reads from the input's :checked.
        <span class="bx-Switch-control">
          {input}
          <span class="bx-Switch-track" aria-hidden="true">
            {local.onLabel !== undefined && <span class="bx-Switch-onLabel">{local.onLabel}</span>}
            {local.offLabel !== undefined && (
              <span class="bx-Switch-offLabel">{local.offLabel}</span>
            )}
            <span class="bx-Switch-thumb">{local.thumbIcon}</span>
          </span>
        </span>
      )}
    />
  );
}
