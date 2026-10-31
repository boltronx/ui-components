import { type Accessor, createEffect, createMemo, createRoot, createSignal, on } from "solid-js";

import {
  type ColorScheme,
  type ColorSchemeMode,
  type ColorSchemeOptions,
  DEFAULT_COLOR_SCHEME_KEY
} from "./script";

export interface ColorSchemeState {
  /** The chosen mode: "light", "dark" or "system". */
  mode: Accessor<ColorSchemeMode>;
  /** The scheme in effect: "light" or "dark", with "system" resolved from the OS. */
  scheme: Accessor<ColorScheme>;
  setMode: (mode: ColorSchemeMode) => void;
}

function parseMode(value: string | null): ColorSchemeMode | undefined {
  return value === "light" || value === "dark" || value === "system" ? value : undefined;
}

function readMode(key: string): ColorSchemeMode | undefined {
  try {
    return parseMode(localStorage.getItem(key));
  } catch {
    return undefined;
  }
}

function applyScheme(scheme: ColorScheme) {
  const html = document.documentElement;
  if (html.getAttribute("data-theme") === scheme) return;
  // Suppress transitions for the swap; reading computed style flushes it before re-enabling.
  html.classList.add("bx-theme-switching");
  html.setAttribute("data-theme", scheme);
  void window.getComputedStyle(html).color;
  html.classList.remove("bx-theme-switching");
}

function createColorScheme(key: string, defaultMode: ColorSchemeMode): ColorSchemeState {
  return createRoot(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const [mode, setModeSignal] = createSignal<ColorSchemeMode>(readMode(key) ?? defaultMode);
    const [systemDark, setSystemDark] = createSignal(media.matches);
    const scheme = createMemo<ColorScheme>(() =>
      mode() === "system" ? (systemDark() ? "dark" : "light") : (mode() as ColorScheme)
    );

    media.addEventListener("change", event => setSystemDark(event.matches));
    // Keeps every open tab on the same mode.
    window.addEventListener("storage", event => {
      if (event.key === key) setModeSignal(parseMode(event.newValue) ?? defaultMode);
    });
    createEffect(on(scheme, applyScheme));

    const setMode = (next: ColorSchemeMode) => {
      setModeSignal(next);
      try {
        localStorage.setItem(key, next);
      } catch {
        // Storage can be unavailable (private mode, blocked cookies); the mode still applies.
      }
    };

    return { mode, scheme, setMode };
  });
}

const states = new Map<string, ColorSchemeState>();

/**
 * Reads and changes the color scheme. Every caller with the same `key` shares one state, so a
 * toggle in one component updates the others. Pair it with `colorSchemeScript` in <head> to avoid
 * a flash of the wrong scheme on load.
 */
export function useColorScheme(options: ColorSchemeOptions = {}): ColorSchemeState {
  const key = options.key ?? DEFAULT_COLOR_SCHEME_KEY;
  const defaultMode = options.defaultMode ?? "system";
  if (typeof window === "undefined") {
    const scheme = defaultMode === "dark" ? "dark" : "light";
    return { mode: () => defaultMode, scheme: () => scheme, setMode: () => {} };
  }
  let state = states.get(key);
  if (!state) {
    state = createColorScheme(key, defaultMode);
    states.set(key, state);
  }
  return state;
}
