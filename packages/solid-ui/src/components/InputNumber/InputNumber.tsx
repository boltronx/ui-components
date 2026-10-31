import type { JSX } from "solid-js";
import { createMemo, createSignal, splitProps } from "solid-js";

import { createDebouncedCall } from "../../utils/debounce";
import { createControllableSignal, onFormReset } from "../../utils/form";
import { Input, type InputProps } from "../Input/Input";
import { useReadOnly } from "../ReadOnly/ReadOnly";

export type DecimalConfig = number | { min?: number; max?: number };

export interface InputNumberProps extends Omit<
  InputProps,
  | "type"
  | "leftSection"
  | "inputMode"
  | "value"
  | "defaultValue"
  | "maxLength"
  | "minLength"
  | "onChange"
  | "onInput"
> {
  /** Controlled value; `null` is a controlled empty field. */
  value?: number | null;
  /** Uncontrolled starting value; a form reset restores it. */
  defaultValue?: number | null;
  /** Fraction digits: a fixed count, or a range. Default 0–5, or 2–3 with `currency`. */
  decimals?: DecimalConfig;
  /** ISO 4217 code, e.g. "PHP" or "USD". Shows the currency symbol before the value. */
  currency?: string;
  /** Delay before `onInput` reports a value while typing. Default 400ms. */
  onInputDebounceMs?: number;
  /**
   * Called while typing (debounced) and on blur. The signal aborts when the next call is made, so
   * a request started here (e.g. a price quote) can drop a stale response.
   */
  onInput?: (value: number | null, signal: AbortSignal) => void;
  /** Called on blur with the parsed, clamped and rounded value. */
  onChange?: (value: number | null) => void;
}

const formatterCache = /* @__PURE__ */ new Map<string, Intl.NumberFormat>();

// Strips float noise (e.g. 1392.1874999999998 -> 1392.1875) so values behave like exact decimals.
function stripFloatNoise(value: number): number {
  return Number(value.toPrecision(15));
}

function normalizeDecimals(value: number | undefined): number {
  const n = value ?? 0;
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.trunc(n));
}

function resolveDecimals(
  decimals: DecimalConfig | undefined,
  fallback = { min: 0, max: 5 }
): { min: number; max: number } {
  if (typeof decimals === "number") {
    const n = normalizeDecimals(decimals);
    return { min: n, max: n };
  }
  const min = normalizeDecimals(decimals?.min ?? fallback.min);
  const max = normalizeDecimals(decimals?.max ?? fallback.max);
  return max < min ? { min, max: min } : { min, max };
}

/**
 * Rounds half away from zero on the decimal value, matching PostgreSQL numeric round(value, decimals).
 * e.g. roundNumber(1559.25 / 1.12, 3) === 1392.188
 */
export function roundNumber(value: number, decimals: number): number {
  if (!Number.isFinite(value)) return value;
  const factor = 10 ** normalizeDecimals(decimals);
  const clean = stripFloatNoise(value);
  const rounded = Math.round(stripFloatNoise(Math.abs(clean) * factor)) / factor;
  return clean < 0 ? -rounded : rounded;
}

/** Formats with grouping, e.g. formatNumber(1234.5, 2) === "1,234.50". */
export function formatNumber(value: number | null | undefined, decimals?: DecimalConfig): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "";
  const resolved = resolveDecimals(decimals);
  const cacheKey = `${resolved.min}:${resolved.max}`;
  let formatter = formatterCache.get(cacheKey);
  if (!formatter) {
    formatter = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: resolved.min,
      maximumFractionDigits: resolved.max
    });
    formatterCache.set(cacheKey, formatter);
  }
  // Intl rounds half away from zero, like PostgreSQL numeric round(), once float noise is gone.
  return formatter.format(stripFloatNoise(value));
}

/**
 * Parses a typed or formatted number ("1,234.5"); empty or invalid text is null. Commas must group
 * thousands: "1,5" (a decimal comma) is invalid rather than read as 15.
 */
export function parseNumber(text: string): number | null {
  const trimmed = text.trim();
  if (trimmed.includes(",") && !/^-?\d{1,3}(,\d{3})+(\.\d*)?$/.test(trimmed)) return null;
  const cleaned = trimmed.replace(/,/g, "");
  if (cleaned === "" || cleaned === "-") return null;
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

function isWithinSafePrecision(text: string, maxDecimals: number): boolean {
  const trimmed = text.trim();
  // Commas only between digits of the whole part, where grouping goes; one may end the text
  // while typing. So "1.234,56" (a decimal comma) is refused as it is typed or pasted.
  if (!/^-?(\d+(,\d+)*,?)?(\.\d*)?$/.test(trimmed)) return false;
  const cleaned = trimmed.replace(/,/g, "");
  if (cleaned === "" || cleaned === "-" || cleaned === "." || cleaned === "-.") return true;
  const fraction = cleaned.split(".")[1];
  if (fraction && fraction.length > maxDecimals) return false;
  const digits = cleaned.replace(/[-.]/g, "").replace(/^0+/, "");
  return digits.length <= 15;
}

function resolveLimit(limit: string | number | undefined): number | undefined {
  if (limit === undefined) return undefined;
  const parsed = typeof limit === "number" ? limit : parseFloat(limit);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function currencySymbol(currency: string): string {
  try {
    const parts = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol"
    }).formatToParts(0);
    return parts.find(part => part.type === "currency")?.value ?? currency;
  } catch {
    return currency;
  }
}

/**
 * A number field that shows grouped digits ("1,234.50") but submits the plain number ("1234.5")
 * through a hidden input named `name`.
 */
export function InputNumber(props: InputNumberProps) {
  const [local, inputProps] = splitProps(props, [
    "name",
    "decimals",
    "currency",
    "value",
    "defaultValue",
    "onInput",
    "onInputDebounceMs",
    "onChange",
    "onFocus",
    "onBlur",
    "readOnly",
    "min",
    "max",
    "ref",
    "inputClass"
  ]);

  // What the event handlers read, as memos: a handler has no reactive owner, and reading a prop
  // written as a condition (`max={a() ? b : c}`) there would make Solid create a computation that
  // is never disposed.
  const decimalConfig = createMemo(() =>
    resolveDecimals(local.decimals, local.currency ? { min: 2, max: 3 } : undefined)
  );
  const limits = createMemo(() => ({ min: resolveLimit(local.min), max: resolveLimit(local.max) }));
  const reportsInput = createMemo(() => local.onInput !== undefined);
  const maxDecimals = () => decimalConfig().max;
  const clamp = (n: number | null) => {
    if (n === null) return null;
    const { min, max } = limits();
    if (min !== undefined && n < min) return min;
    if (max !== undefined && n > max) return max;
    return n;
  };
  /**
   * Clamped and rounded. Rounding can step past a limit with more decimals than the field keeps
   * (max 1.005 with 2 decimals would round to 1.01), so a limit is rounded toward the inside.
   */
  const round = (n: number | null) => {
    if (n === null) return null;
    const decimals = maxDecimals();
    const rounded = roundNumber(clamp(n)!, decimals);
    const factor = 10 ** decimals;
    const { min, max } = limits();
    if (max !== undefined && rounded > max)
      return Math.floor(stripFloatNoise(max * factor)) / factor;
    if (min !== undefined && rounded < min)
      return Math.ceil(stripFloatNoise(min * factor)) / factor;
    return rounded;
  };

  const state = createControllableSignal<number | null>({
    value: () => (local.value === undefined ? undefined : clamp(local.value)),
    defaultValue: () => clamp(local.defaultValue ?? null)
  });
  const [focused, setFocused] = createSignal(false);
  const [rawText, setRawText] = createSignal("");
  const isReadOnly = useReadOnly(() => local.readOnly === true);
  let input: HTMLInputElement | undefined;
  const debouncedInput = createDebouncedCall<number | null>(
    () => local.onInput,
    () => local.onInputDebounceMs ?? 400
  );
  onFormReset(
    () => input,
    () => {
      state.reset();
      const value = round(state.value());
      setRawText(value === null ? "" : String(value));
    }
  );

  const displayValue = () =>
    focused() ? rawText() : formatNumber(round(state.value()), decimalConfig());
  // While focused, the typed text: Enter submits the form before the blur that commits it.
  const submittedValue = () => {
    const value = round(focused() ? parseNumber(rawText()) : state.value());
    return value === null ? "" : String(value);
  };

  const handleFocus: JSX.FocusEventHandler<HTMLInputElement, FocusEvent> = event => {
    if (!isReadOnly()) {
      const value = state.value();
      setRawText(value === null ? "" : String(round(value)));
      setFocused(true);
      // currentTarget is null once dispatch ends, so keep the element for the microtask.
      const element = event.currentTarget;
      queueMicrotask(() => element.select());
    }
    if (typeof local.onFocus === "function") local.onFocus(event);
  };

  const handleBlur: JSX.FocusEventHandler<HTMLInputElement, FocusEvent> = event => {
    if (focused()) {
      const value = round(parseNumber(rawText()));
      state.setValue(value);
      setFocused(false);
      debouncedInput.now(value);
      local.onChange?.(value);
    }
    if (typeof local.onBlur === "function") local.onBlur(event);
  };

  const handleInput: JSX.EventHandler<HTMLInputElement, InputEvent> = event => {
    const text = event.currentTarget.value;
    if (!isWithinSafePrecision(text, maxDecimals())) {
      event.currentTarget.value = rawText();
      return;
    }
    setRawText(text);
    if (reportsInput()) debouncedInput.schedule(clamp(parseNumber(text)));
  };

  return (
    <>
      <Input
        {...inputProps}
        ref={element => {
          input = element;
          local.ref?.(element);
        }}
        inputClass={local.inputClass ? `bx-InputNumber ${local.inputClass}` : "bx-InputNumber"}
        inputMode="decimal"
        min={local.min}
        max={local.max}
        value={displayValue()}
        leftSection={
          local.currency ? (
            <span class="bx-InputNumber-currency">{currencySymbol(local.currency)}</span>
          ) : undefined
        }
        placeholder={inputProps.placeholder ?? (local.currency ? "0.00" : undefined)}
        readOnly={isReadOnly()}
        onInput={handleInput}
        onFocus={handleFocus}
        onBlur={handleBlur}
      />
      <input
        type="hidden"
        name={local.name}
        // This is the input that submits, so it joins a form named by `form` like the field does.
        form={inputProps.form}
        value={submittedValue()}
        disabled={inputProps.disabled}
      />
    </>
  );
}
