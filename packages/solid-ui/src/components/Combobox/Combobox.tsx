import type { JSX } from "solid-js";
import { Show } from "solid-js";

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
    <div class="bx-Combobox-state" role="status">
      <Show when={!props.hint} fallback={props.hint}>
        <Show
          when={props.loading}
          fallback={
            <Show when={props.empty}>{props.nothingFoundMessage ?? "No options found"}</Show>
          }
        >
          {/* Hidden so the loader's own status does not repeat the text. */}
          <span aria-hidden="true">
            <Loader size="xs" />
          </span>
          Loading...
        </Show>
      </Show>
    </div>
  );
}

/** The hint shown while a server search waits for more characters. */
export function minLengthHint(minLength: number | undefined, message: string | undefined): string {
  return message ?? `Type at least ${minLength} characters`;
}

export function ComboboxOptionContent(props: {
  option: SelectOption;
  render?: (option: SelectOption) => JSX.Element;
}) {
  return (
    <span class="bx-Combobox-optionBody">
      <Show
        when={props.render}
        fallback={
          <>
            <span class="bx-Combobox-optionLabel">{props.option.label}</span>
            <Show when={props.option.description}>
              <small class="bx-Combobox-optionDescription">{props.option.description}</small>
            </Show>
          </>
        }
      >
        {render => render()(props.option)}
      </Show>
    </span>
  );
}
