"use client";

import { useEffect, useRef } from "react";

import { useLatest } from "./form";

export interface DebouncedCall<T> {
  /** Calls after the delay, replacing a call still waiting. */
  schedule: (value: T) => void;
  /** Calls right away, replacing a call still waiting. */
  now: (value: T) => void;
  /** Drops a call still waiting; the last call made keeps going. */
  drop: () => void;
  /** Drops a call still waiting and aborts the last call's signal. */
  cancel: () => void;
}

/**
 * Debounces calls to `callback`. Each call gets an AbortSignal that aborts when the next call is
 * made, on `cancel`, or when the component unmounts, so `fetch(url, { signal })` drops a response
 * that a newer value has made stale. Outside React, call `dispose` to clean up.
 */
export function createDebouncedCall<T>(
  callback: () => ((value: T, signal: AbortSignal) => void) | undefined,
  delay: () => number
): DebouncedCall<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let controller: AbortController | undefined;

  const drop = () => {
    clearTimeout(timer);
    timer = undefined;
  };

  const now = (value: T) => {
    drop();
    controller?.abort();
    controller = new AbortController();
    callback()?.(value, controller.signal);
  };

  const schedule = (value: T) => {
    drop();
    const ms = Math.max(0, delay());
    if (ms === 0) now(value);
    else timer = setTimeout(() => now(value), ms);
  };

  const cancel = () => {
    drop();
    controller?.abort();
    controller = undefined;
  };

  return { schedule, now, drop, cancel };
}

export interface SearchCall extends DebouncedCall<string> {
  /** True for text too short to search, other than "" (which resets a search). */
  tooShort: (value: string) => boolean;
}

/**
 * A search callback: debounced (default 300ms), with an AbortSignal, skipped for text shorter than
 * `minLength`, and not repeated for the value it last sent.
 */
export function createSearchCall(options: {
  callback: () => ((value: string, signal: AbortSignal) => void) | undefined;
  delay: () => number | undefined;
  minLength: () => number | undefined;
}): SearchCall {
  // Starts as "": the options a component is given are the ones for an empty search. So closing a
  // dropdown that was never searched, or typing back to the sent text, doesn't call again.
  let lastSent: string | undefined = "";
  const call = createDebouncedCall<string>(
    () => {
      const callback = options.callback();
      if (!callback) return undefined;
      return (value, signal) => {
        lastSent = value;
        callback(value, signal);
      };
    },
    () => options.delay() ?? 300
  );

  const tooShort = (value: string) => {
    const length = value.trim().length;
    return length > 0 && length < (options.minLength() ?? 0);
  };

  /** True when this value should not be sent, after handling why. */
  const skip = (value: string) => {
    if (tooShort(value)) {
      // Results for the longer text no longer apply.
      cancel();
      return true;
    }
    if (value === lastSent) {
      // Back to the text already sent: its request still stands.
      call.drop();
      return true;
    }
    return false;
  };

  const cancel = () => {
    lastSent = undefined;
    call.cancel();
  };

  return {
    tooShort,
    schedule: value => {
      if (!skip(value)) call.schedule(value);
    },
    now: value => {
      if (!skip(value)) call.now(value);
    },
    drop: call.drop,
    cancel
  };
}

/** A debounced call that reads the latest props and is cancelled on unmount. */
export function useDebouncedCall<T>(
  callback: ((value: T, signal: AbortSignal) => void) | undefined,
  delay: number
): DebouncedCall<T> {
  const latest = useLatest({ callback, delay });
  const ref = useRef<DebouncedCall<T>>(null);
  ref.current ??= createDebouncedCall<T>(
    () => latest.current.callback,
    () => latest.current.delay
  );
  const call = ref.current;
  useEffect(() => call.cancel, [call]);
  return call;
}

/** A search call that reads the latest props and is cancelled on unmount. */
export function useSearchCall(options: {
  callback: ((value: string, signal: AbortSignal) => void) | undefined;
  delay: number | undefined;
  minLength: number | undefined;
}): SearchCall {
  const latest = useLatest(options);
  const ref = useRef<SearchCall>(null);
  ref.current ??= createSearchCall({
    callback: () => latest.current.callback,
    delay: () => latest.current.delay,
    minLength: () => latest.current.minLength
  });
  const call = ref.current;
  useEffect(() => call.cancel, [call]);
  return call;
}
