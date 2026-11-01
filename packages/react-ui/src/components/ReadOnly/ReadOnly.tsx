"use client";

import { createContext, type ReactNode, useContext } from "react";

const ReadOnlyContext = createContext(false);

/** Makes every input inside read-only, e.g. to show a saved form before an Edit button. */
export function ReadOnlyProvider(props: { readOnly: boolean; children: ReactNode }) {
  return <ReadOnlyContext value={props.readOnly}>{props.children}</ReadOnlyContext>;
}

export function useReadOnly(readOnly?: boolean): boolean {
  return useContext(ReadOnlyContext) || readOnly === true;
}
