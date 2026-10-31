import { type JSX, splitProps, type ValidComponent } from "solid-js";
import { Dynamic } from "solid-js/web";

import {
  type AlignItems,
  type BaseProps,
  cx,
  type JustifyContent,
  mergeStyle,
  resolveSize,
  type SizeProp
} from "../../utils/style";

export type FlexDirection = "row" | "column" | "row-reverse" | "column-reverse";

/** Min-width breakpoints: sm 36rem, md 48rem, lg 62rem, xl 75rem (576, 768, 992, 1200px). */
export type FlexBreakpoint = "sm" | "md" | "lg" | "xl";

/**
 * A direction, or one per screen width from narrowest up, e.g. `{ base: "column", md: "row" }`:
 * a column on phones, a row from 48rem.
 */
export type ResponsiveDirection =
  | FlexDirection
  | ({ base?: FlexDirection } & {
      [breakpoint in FlexBreakpoint]?: FlexDirection;
    });

const BREAKPOINTS: FlexBreakpoint[] = ["sm", "md", "lg", "xl"];

export interface FlexProps
  extends Omit<JSX.HTMLAttributes<HTMLElement>, "class" | "style">, BaseProps {
  children?: JSX.Element;
  /** Element to render, e.g. "ul" or "nav". Default "div". */
  component?: ValidComponent;
  /** Default "row". */
  direction?: ResponsiveDirection;
  wrap?: "nowrap" | "wrap" | "wrap-reverse";
  justify?: JustifyContent;
  align?: AlignItems;
  /** A spacing token (xs–xl), a number of px, or any CSS length. Default none. */
  gap?: SizeProp;
  /** Overrides `gap` between rows. */
  rowGap?: SizeProp;
  /** Overrides `gap` between columns. */
  columnGap?: SizeProp;
  /** Sits in a line of text, as inline-flex. */
  inline?: boolean;
}

/**
 * The general flexbox container, for what Stack (a column) and Group (a row) don't cover:
 * reversed or responsive directions, wrapping and separate row and column gaps. Responsive
 * directions need no JavaScript, so a server render already has the right layout.
 */
export function Flex(props: FlexProps) {
  const [local, others] = splitProps(props, [
    "children",
    "component",
    "class",
    "style",
    "direction",
    "wrap",
    "justify",
    "align",
    "gap",
    "rowGap",
    "columnGap",
    "inline"
  ]);
  const directions = (): Exclude<ResponsiveDirection, FlexDirection> =>
    typeof local.direction === "object" ? local.direction : { base: local.direction };
  // Each breakpoint's direction goes in a variable the stylesheet's media queries read, so the
  // layout changes with the screen without JavaScript.
  const breakpointVars = () =>
    Object.fromEntries(
      BREAKPOINTS.map(breakpoint => [`--bx-flex-direction-${breakpoint}`, directions()[breakpoint]])
    );
  const breakpointFlags = () =>
    Object.fromEntries(
      BREAKPOINTS.map(breakpoint => [
        `data-direction-${breakpoint}`,
        directions()[breakpoint] === undefined ? undefined : ""
      ])
    );

  return (
    <Dynamic
      {...others}
      {...breakpointFlags()}
      component={local.component ?? "div"}
      class={cx("bx-Flex", local.class)}
      data-inline={local.inline ? "" : undefined}
      style={mergeStyle(local.style, {
        // Always set: custom properties inherit, so an unset one would take a parent Flex's.
        "--bx-flex-direction": directions().base ?? "row",
        ...breakpointVars(),
        "flex-wrap": local.wrap,
        "justify-content": local.justify,
        "align-items": local.align,
        gap: resolveSize(local.gap),
        "row-gap": resolveSize(local.rowGap),
        "column-gap": resolveSize(local.columnGap)
      })}
    >
      {local.children}
    </Dynamic>
  );
}
