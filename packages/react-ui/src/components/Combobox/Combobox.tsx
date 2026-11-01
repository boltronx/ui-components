import type { ReactNode } from "react";

import { Loader } from "../Loader/Loader";
import type { SelectOption } from "../Select/Select";

/**
 * A dropdown's loading or empty message. It stays mounted as a live region beside the listbox (a
 * listbox may only hold options), so screen readers hear "No options found" as the user types.
 */
export function ComboboxState(props: {
  loading?: boolean;
  empty: boolean;
  nothingFoundMessage?: string;
  /** Replaces the other states, e.g. "Type at least 3 characters". */
  hint?: string;
}) {
  return (
    <div className="bx-Combobox-state" role="status">
      {props.hint ? (
        props.hint
      ) : props.loading ? (
        <>
          {/* Hidden so the loader's own status does not repeat the text. */}
          <span aria-hidden="true">
            <Loader size="xs" />
          </span>
          Loading...
        </>
      ) : props.empty ? (
        (props.nothingFoundMessage ?? "No options found")
      ) : null}
    </div>
  );
}

/** The hint shown while a server search waits for more characters. */
export function minLengthHint(minLength: number | undefined, message: string | undefined): string {
  return message ?? `Type at least ${minLength} characters`;
}

export function ComboboxOptionContent(props: {
  option: SelectOption;
  render?: (option: SelectOption) => ReactNode;
}) {
  return (
    <span className="bx-Combobox-optionBody">
      {props.render ? (
        props.render(props.option)
      ) : (
        <>
          <span className="bx-Combobox-optionLabel">{props.option.label}</span>
          {props.option.description ? (
            <small className="bx-Combobox-optionDescription">{props.option.description}</small>
          ) : null}
        </>
      )}
    </span>
  );
}
