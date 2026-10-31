import { createMemo, onCleanup } from "solid-js";

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
 * that a newer value has made stale.
 */
export function createDebouncedCall<T>(
  callback: () => ((value: T, signal: AbortSignal) => void) | undefined,
  delay: () => number
): DebouncedCall<T> {
  // Read in timers and event handlers, which have no reactive owner: as memos, made here, a prop
  // written as a condition doesn't make Solid create a computation that is never disposed.
  const currentCallback = createMemo(callback);
  const currentDelay = createMemo(delay);
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
    currentCallback()?.(value, controller.signal);
  };

  const schedule = (value: T) => {
    drop();
    const ms = Math.max(0, currentDelay());
    if (ms === 0) now(value);
    else timer = setTimeout(() => now(value), ms);
  };

  const cancel = () => {
    drop();
    controller?.abort();
    controller = undefined;
  };

  onCleanup(cancel);
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
  const minLength = createMemo(options.minLength);
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
    return length > 0 && length < (minLength() ?? 0);
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
