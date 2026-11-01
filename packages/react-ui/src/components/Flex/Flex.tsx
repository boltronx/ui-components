import type { ElementType, HTMLAttributes, ReactNode, Ref } from "react";

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
  extends Omit<HTMLAttributes<HTMLElement>, "className" | "style" | "color">, BaseProps {
  children?: ReactNode;
  /** Element to render, e.g. "ul" or "nav". Default "div". */
  component?: ElementType;
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
  ref?: Ref<HTMLElement>;
}

/**
 * The general flexbox container, for what Stack (a column) and Group (a row) don't cover:
 * reversed or responsive directions, wrapping and separate row and column gaps. It has no state,
 * so it renders as a Server Component, responsive directions included.
 */
export function Flex({
  children,
  component,
  className,
  style,
  direction,
  wrap,
  justify,
  align,
  gap,
  rowGap,
  columnGap,
  inline,
  ...others
}: FlexProps) {
  const Component = component ?? "div";
  const directions = typeof direction === "object" ? direction : { base: direction };
  // Each breakpoint's direction goes in a variable the stylesheet's media queries read, so the
  // layout changes with the screen without JavaScript, and is right in the server's HTML.
  const breakpointVars: Record<string, string | undefined> = {};
  const breakpointFlags: Record<string, string | undefined> = {};
  for (const breakpoint of BREAKPOINTS) {
    const value = directions[breakpoint];
    breakpointVars[`--bx-flex-direction-${breakpoint}`] = value;
    breakpointFlags[`data-direction-${breakpoint}`] = value === undefined ? undefined : "";
  }

  return (
    <Component
      {...others}
      {...breakpointFlags}
      className={cx("bx-Flex", className)}
      data-inline={inline ? "" : undefined}
      style={mergeStyle(style, {
        // Always set: custom properties inherit, so an unset one would take a parent Flex's.
        "--bx-flex-direction": directions.base ?? "row",
        ...breakpointVars,
        flexWrap: wrap,
        justifyContent: justify,
        alignItems: align,
        gap: resolveSize(gap),
        rowGap: resolveSize(rowGap),
        columnGap: resolveSize(columnGap)
      })}
    >
      {children}
    </Component>
  );
}
