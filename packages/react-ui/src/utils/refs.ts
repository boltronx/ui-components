"use client";

import { type Ref, type RefCallback, useCallback } from "react";

/** Sets every ref to the element; React 19 ref callbacks may return a cleanup function. */
export function mergeRefs<T>(...refs: (Ref<T> | undefined)[]): RefCallback<T> {
  return element => {
    const cleanups: (() => void)[] = [];
    for (const ref of refs) {
      if (typeof ref === "function") {
        const cleanup = ref(element);
        cleanups.push(typeof cleanup === "function" ? cleanup : () => ref(null));
      } else if (ref) {
        ref.current = element;
        cleanups.push(() => {
          ref.current = null;
        });
      }
    }
    return () => cleanups.forEach(cleanup => cleanup());
  };
}

/** `mergeRefs` kept stable across renders, so React doesn't detach and reattach every time. */
export function useMergedRefs<T>(...refs: (Ref<T> | undefined)[]): RefCallback<T> {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useCallback(mergeRefs(...refs), refs);
}
