import {
  type Accessor,
  createEffect,
  createMemo,
  createRoot,
  createSignal,
  getOwner,
  on,
  onMount,
  runWithOwner,
  sharedConfig
} from "solid-js";

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

interface ColorSchemeStore extends ColorSchemeState {
  /** Reads the saved mode and the OS preference, then follows and applies them. Runs once. */
  start: () => void;
}

function createColorScheme(key: string, defaultMode: ColorSchemeMode): ColorSchemeStore {
  return createRoot(() => {
    const owner = getOwner();
    // Until started, what the server rendered: it can read neither storage nor the OS preference.
    const [mode, setModeSignal] = createSignal<ColorSchemeMode>(defaultMode);
    const [systemDark, setSystemDark] = createSignal(false);
    const scheme = createMemo<ColorScheme>(() =>
      mode() === "system" ? (systemDark() ? "dark" : "light") : (mode() as ColorScheme)
    );

    let started = false;
    const start = () => {
      if (started) return;
      started = true;
      const media = window.matchMedia("(prefers-color-scheme: dark)");
      setSystemDark(media.matches);
      setModeSignal(readMode(key) ?? mode());
      media.addEventListener("change", event => setSystemDark(event.matches));
      // Keeps every open tab on the same mode.
      window.addEventListener("storage", event => {
        if (event.key === key) setModeSignal(parseMode(event.newValue) ?? defaultMode);
      });
      // Only now: the server's scheme would undo what colorSchemeScript set before first paint.
      runWithOwner(owner, () => createEffect(on(scheme, applyScheme)));
    };

    const setMode = (next: ColorSchemeMode) => {
      setModeSignal(next);
      try {
        localStorage.setItem(key, next);
      } catch {
        // Storage can be unavailable (private mode, blocked cookies); the mode still applies.
      }
    };

    return { mode, scheme, setMode, start };
  });
}

const states = new Map<string, ColorSchemeStore>();

/**
 * Reads and changes the color scheme. Every caller with the same `key` shares one state, so a
 * toggle in one component updates the others. Pair it with `colorSchemeScript` in <head> to avoid
 * a flash of the wrong scheme on load. While hydrating it gives what the server rendered (the
 * default), so the first client render matches; the saved mode takes over once hydration is done.
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
  // Hydrating, the first render must match the server's, so storage is read once it is done.
  if (sharedConfig.context) onMount(state.start);
  else state.start();
  const { mode, scheme, setMode } = state;
  return { mode, scheme, setMode };
}
