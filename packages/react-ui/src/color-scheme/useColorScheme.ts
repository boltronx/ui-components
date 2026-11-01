"use client";

import { useCallback, useSyncExternalStore } from "react";

import {
  type ColorScheme,
  type ColorSchemeMode,
  type ColorSchemeOptions,
  DEFAULT_COLOR_SCHEME_KEY
} from "./script";

export interface ColorSchemeState {
  /** The chosen mode: "light", "dark" or "system". */
  mode: ColorSchemeMode;
  /** The scheme in effect: "light" or "dark", with "system" resolved from the OS. */
  scheme: ColorScheme;
  setMode: (mode: ColorSchemeMode) => void;
}

interface Snapshot {
  mode: ColorSchemeMode;
  scheme: ColorScheme;
}

interface ColorSchemeStore {
  get: () => Snapshot;
  subscribe: (listener: () => void) => () => void;
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

/** One store per key, created on first use in the browser and shared by every caller. */
function createColorSchemeStore(key: string, defaultMode: ColorSchemeMode): ColorSchemeStore {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const listeners = new Set<() => void>();
  let mode = readMode(key) ?? defaultMode;
  let systemDark = media.matches;
  let snapshot: Snapshot = { mode, scheme: "light" };
  let started = false;

  /** Brings the snapshot up to date; a new object only when something changed. */
  const refresh = () => {
    const scheme: ColorScheme = mode === "system" ? (systemDark ? "dark" : "light") : mode;
    if (snapshot.mode !== mode || snapshot.scheme !== scheme) snapshot = { mode, scheme };
  };
  refresh();

  const update = () => {
    refresh();
    applyScheme(snapshot.scheme);
    listeners.forEach(listener => listener());
  };

  // The store is created from getSnapshot, during render, which must not change the page. The
  // first subscriber, added once React has committed, applies the scheme and starts listening.
  const start = () => {
    if (started) return;
    started = true;
    media.addEventListener("change", event => {
      systemDark = event.matches;
      update();
    });
    // Keeps every open tab on the same mode.
    window.addEventListener("storage", event => {
      if (event.key !== key) return;
      mode = parseMode(event.newValue) ?? defaultMode;
      update();
    });
    // Catches up on anything that changed between the first render and now.
    systemDark = media.matches;
    mode = readMode(key) ?? mode;
    refresh();
    applyScheme(snapshot.scheme);
  };

  return {
    get: () => snapshot,
    subscribe: listener => {
      start();
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    setMode: next => {
      mode = next;
      try {
        localStorage.setItem(key, next);
      } catch {
        // Storage can be unavailable (private mode, blocked cookies); the mode still applies.
      }
      update();
    }
  };
}

const stores = new Map<string, ColorSchemeStore>();

function storeFor(key: string, defaultMode: ColorSchemeMode): ColorSchemeStore {
  let store = stores.get(key);
  if (!store) {
    store = createColorSchemeStore(key, defaultMode);
    stores.set(key, store);
  }
  return store;
}

const serverSnapshots = new Map<ColorSchemeMode, Snapshot>();

/** What the server renders and hydration starts from: the default, as no storage is readable. */
function serverSnapshot(defaultMode: ColorSchemeMode): Snapshot {
  let snapshot = serverSnapshots.get(defaultMode);
  if (!snapshot) {
    snapshot = { mode: defaultMode, scheme: defaultMode === "dark" ? "dark" : "light" };
    serverSnapshots.set(defaultMode, snapshot);
  }
  return snapshot;
}

/**
 * Reads and changes the color scheme. Every caller with the same `key` shares one state, so a
 * toggle in one component updates the others. The server and the first client render use
 * `defaultMode`; the saved mode takes over right after hydration. Pair it with
 * `ColorSchemeScript` (or `colorSchemeScript`) in <head> so the page never flashes the other scheme.
 */
export function useColorScheme(options: ColorSchemeOptions = {}): ColorSchemeState {
  const key = options.key ?? DEFAULT_COLOR_SCHEME_KEY;
  const defaultMode = options.defaultMode ?? "system";
  const subscribe = useCallback(
    (listener: () => void) => storeFor(key, defaultMode).subscribe(listener),
    [key, defaultMode]
  );
  const getSnapshot = useCallback(() => storeFor(key, defaultMode).get(), [key, defaultMode]);
  const getServerSnapshot = useCallback(() => serverSnapshot(defaultMode), [defaultMode]);
  const { mode, scheme } = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const setMode = useCallback(
    (next: ColorSchemeMode) => storeFor(key, defaultMode).setMode(next),
    [key, defaultMode]
  );
  return { mode, scheme, setMode };
}
