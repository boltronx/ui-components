import type { JSX } from "solid-js";

export type Size = "xs" | "sm" | "md" | "lg" | "xl";
export type SizeProp = Size | (string & {}) | number;
export type StyleProp = string | JSX.CSSProperties | undefined;

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
  class?: string;
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
 * Whether a value stays within its own declaration once written into a style string: no `;`, `{`
 * or `}` outside quotes and brackets, no comment, and every quote and bracket closed. A value such
 * as `red; background: url(...)` would otherwise add declarations of its own, which matters when
 * it comes from user data (e.g. a profile's avatar color). `url(data:...;base64,...)` stays valid.
 */
function isContainedValue(value: string): boolean {
  if (value.includes("/*")) return false;
  let depth = 0;
  let quote: string | undefined;
  for (let i = 0; i < value.length; i++) {
    const char = value[i];
    if (quote) {
      if (char === "\\") i++;
      else if (char === "\n" || char === "\r" || char === "\f") return false;
      else if (char === quote) quote = undefined;
    } else if (char === '"' || char === "'") quote = char;
    // An escape outside quotes could hide a bracket from this count, e.g. `url(a\)`.
    else if (char === "\\") return false;
    else if (char === "(" || char === "[") depth++;
    else if (char === ")" || char === "]") {
      if (--depth < 0) return false;
    } else if (depth === 0 && (char === ";" || char === "{" || char === "}")) return false;
  }
  return depth === 0 && quote === undefined;
}

/** A property name, custom (`--brand`) or regular (`backgroundColor`, `background-color`). */
const PROPERTY_NAME = /^(--[\w-]+|-?[A-Za-z][\w-]*)$/;

function styleEntryToCss(key: string, value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;
  // A key such as `color: red; background` would add declarations of its own, like a value could.
  if (!PROPERTY_NAME.test(key)) return null;
  const text = String(value);
  // Dropped, like any invalid value the browser would ignore.
  if (!isContainedValue(text)) return null;
  // Custom properties are case-sensitive, so only regular property names are kebab-cased.
  const cssKey = key.startsWith("--") ? key : key.replace(/([A-Z])/g, "-$1").toLowerCase();
  return `${cssKey}: ${text}`;
}

function styleObjectToCss(style: Record<string, unknown> | undefined): string {
  if (!style) return "";
  return Object.entries(style)
    .map(([key, value]) => styleEntryToCss(key, value))
    .filter((entry): entry is string => entry !== null)
    .join("; ");
}

/**
 * Merges a user `style` prop (string or object) with the component's own declarations. The user's
 * style comes last, so it wins where both set a property, e.g. `<Card style={{ padding: 0 }}>`.
 * Object values that would break out of their declaration are dropped; a style string is the
 * caller's own CSS and is kept as written.
 */
export function mergeStyle(
  style: StyleProp,
  additions: Record<string, string | undefined>
): string | undefined {
  const userCss =
    typeof style === "string" ? style : styleObjectToCss(style as Record<string, unknown>);
  const additionsCss = styleObjectToCss(additions);

  if (userCss && additionsCss) return `${additionsCss}; ${userCss}`;
  return userCss || additionsCss || undefined;
}
