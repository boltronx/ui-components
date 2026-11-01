"use client";

import type { ReactNode } from "react";

import { type CheckboxBaseProps, CheckboxControl } from "../Checkbox/Checkbox";

export interface SwitchProps extends CheckboxBaseProps {
  /** Default "md". */
  size?: "sm" | "md" | "lg";
  /** Shown inside the track while on, e.g. "ON" or an icon. Keep it to a few characters. */
  onLabel?: ReactNode;
  /** Shown inside the track while off. */
  offLabel?: ReactNode;
  /** Drawn on the thumb, e.g. a sun or moon icon. */
  thumbIcon?: ReactNode;
}

/**
 * An on/off toggle for a setting that applies right away, such as notifications. It is a
 * checkbox underneath, announced as a switch, so it submits like one: `value` (default "on")
 * under `name` while on, nothing while off.
 */
export function Switch({ size, onLabel, offLabel, thumbIcon, ...props }: SwitchProps) {
  return (
    <CheckboxControl
      {...props}
      variant="switch"
      rootProps={{
        "data-size": size ?? "md",
        "data-with-labels": onLabel !== undefined || offLabel !== undefined ? "" : undefined
      }}
      renderControl={input => (
        // The input sits over the track, invisible, so clicks, focus and forms stay native; the
        // track only draws its state, which CSS reads from the input's :checked.
        <span className="bx-Switch-control">
          {input}
          <span className="bx-Switch-track" aria-hidden="true">
            {onLabel !== undefined && <span className="bx-Switch-onLabel">{onLabel}</span>}
            {offLabel !== undefined && <span className="bx-Switch-offLabel">{offLabel}</span>}
            <span className="bx-Switch-thumb">{thumbIcon}</span>
          </span>
        </span>
      )}
    />
  );
}
