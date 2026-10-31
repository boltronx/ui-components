import { type Accessor, createContext, createMemo, type JSX, useContext } from "solid-js";

const ReadOnlyContext = createContext<Accessor<boolean>>(() => false);

/** Makes every input inside read-only, e.g. to show a saved form before an Edit button. */
export function ReadOnlyProvider(props: { readOnly: boolean; children: JSX.Element }) {
  const value = () => props.readOnly;
  return <ReadOnlyContext.Provider value={value}>{props.children}</ReadOnlyContext.Provider>;
}

/**
 * A memo, made where the component is created: components read it in event handlers, which have
 * no reactive owner, and reading a prop written as a condition (`readOnly={a() && b()}`) there
 * would make Solid create a computation that is never disposed.
 */
export function useReadOnly(readOnly?: Accessor<boolean>): Accessor<boolean> {
  const context = useContext(ReadOnlyContext);
  return createMemo(() => context() || readOnly?.() === true);
}
