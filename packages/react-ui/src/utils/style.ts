import type { CSSProperties } from "react";

export type Size = "xs" | "sm" | "md" | "lg" | "xl";
export type SizeProp = Size | (string & {}) | number;
export type StyleProp = CSSProperties | undefined;

export type JustifyContent =
  | "flex-start"
  | "flex-end"
  | "center"
  | "space-between"
  | "space-around"
  | "space-evenly"
  | "start"
  | "end";
export type AlignItems =
  "flex-start" | "flex-end" | "stretch" | "center" | "baseline" | "start" | "end";

export interface BaseProps {
  className?: string;
  style?: StyleProp;
}

const SIZES = new Set<string>(["xs", "sm", "md", "lg", "xl"]);

export function cx(...args: (string | false | undefined | null)[]): string {
  return args.filter((c): c is string => typeof c === "string" && c.length > 0).join(" ");
}

/** Resolves a size prop to a CSS length: a token name, a number of px, or any CSS length. */
export function resolveSize(size: SizeProp, scale?: string): string;
export function resolveSize(size: SizeProp | undefined, scale?: string): string | undefined;
export function resolveSize(size: SizeProp | undefined, scale = "spacing"): string | undefined {
  if (size === undefined) return undefined;
  if (typeof size === "number") return `${size}px`;
  if (SIZES.has(size)) return `var(--bx-${scale}-${size})`;
  return size;
}

/**
 * Merges a user `style` prop with the component's own declarations. The user's style wins where
 * both set a property, e.g. `<Card style={{ padding: 0 }}>`; undefined values are left out on
 * both sides. Keys are React style names or `--custom` ones.
 */
export function mergeStyle(
  style: StyleProp,
  additions: Record<string, string | number | undefined>
): CSSProperties | undefined {
  const merged: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(additions)) {
    if (value !== undefined && value !== "") merged[key] = value;
  }
  for (const [key, value] of Object.entries(style ?? {})) {
    if (value !== undefined) merged[key] = value as string | number;
  }
  return Object.keys(merged).length > 0 ? (merged as CSSProperties) : undefined;
}
