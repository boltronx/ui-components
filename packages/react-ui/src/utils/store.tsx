"use client";

import type { ReactNode } from "react";
import { createRoot } from "react-dom/client";

export interface ListStore<T> {
  get: () => T[];
  subscribe: (listener: () => void) => () => void;
  /**
   * Updates the list. React renders the change as it does any state update: before the browser
   * paints when called from an event handler or effect, otherwise in a microtask.
   */
  update: (updater: (prev: T[]) => T[]) => void;
  /** Whether a host inside the app renders the list, in place of the store's own root. */
  hosted: () => boolean;
  /** Registers such a host; returns a function that unregisters it. */
  addHost: () => () => void;
}

/**
 * A list kept outside React, for the imperative `message` and `modal` APIs. The first update
 * mounts `container` in its own root at the end of <body>, so nothing renders on the server,
 * unless a host inside the app (see `addHost`) renders the list instead.
 *
 * Updates aren't forced through `flushSync`: the APIs are meant to be called from effects too
 * (e.g. a message once data has loaded), and React refuses a synchronous flush there.
 */
export function createListStore<T>(container: () => ReactNode): ListStore<T> {
  let items: T[] = [];
  let mounted = false;
  let hosts = 0;
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach(listener => listener());

  const mount = () => {
    if (mounted || hosts > 0) return;
    mounted = true;
    const host = document.createElement("div");
    document.body.appendChild(host);
    createRoot(host).render(container());
  };

  return {
    get: () => items,
    subscribe: listener => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    update: updater => {
      mount();
      items = updater(items);
      notify();
    },
    hosted: () => hosts > 0,
    addHost: () => {
      hosts++;
      notify();
      return () => {
        hosts--;
        notify();
      };
    }
  };
}

const EMPTY: never[] = [];
/** The server snapshot: no items, since the store only fills in the browser. */
export const emptyList = () => EMPTY;
