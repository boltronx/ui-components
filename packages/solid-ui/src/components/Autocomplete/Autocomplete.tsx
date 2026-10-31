import type { JSX } from "solid-js";
import {
  createEffect,
  createMemo,
  createSignal,
  createUniqueId,
  For,
  onCleanup,
  Show,
  splitProps
} from "solid-js";

import { ChevronDownIcon } from "../../icons";
import { createSearchCall } from "../../utils/debounce";
import { createControllableSignal, onFormReset } from "../../utils/form";
import { ComboboxOptionContent, ComboboxState, minLengthHint } from "../Combobox/Combobox";
import { FloatingPanel } from "../FloatingPanel/FloatingPanel";
import { Input, type InputProps } from "../Input/Input";
import { Loader } from "../Loader/Loader";
import { useReadOnly } from "../ReadOnly/ReadOnly";
import { ScrollArea } from "../ScrollArea/ScrollArea";
import type { SelectOption } from "../Select/Select";

export interface AutocompleteProps extends Omit<
  InputProps,
  | "type"
  | "min"
  | "max"
  | "step"
  | "inputMode"
  | "pattern"
  | "value"
  | "defaultValue"
  | "onInput"
  | "onChange"
  | "rightSection"
> {
  /** Suggestions. The field accepts any text; picking one fills in its label. */
  options: SelectOption[];
  /** Controlled text. The parent owns it; a form reset leaves it in place. */
  value?: string;
  /** Uncontrolled starting text; a form reset restores it. */
  defaultValue?: string;
  /**
   * A search is running: the field shows a spinner, and the dropdown keeps the previous
   * suggestions until new ones arrive, so the list doesn't flicker as the user types.
   */
  loading?: boolean;
  /**
   * Shown when no suggestion matches. Without it the dropdown just stays closed: any text is
   * valid here, so having no suggestion isn't something to report.
   */
  nothingFoundMessage?: string;
  renderOption?: (option: SelectOption) => JSX.Element;
  /** Replaces the chevron at the end of the field. */
  chevronIcon?: JSX.Element;
  /** Called with the text on every keystroke and when a suggestion is picked. */
  onChange?: (value: string) => void;
  onOptionSubmit?: (option: SelectOption) => void;
  /**
   * Set to search on the server: options are then shown as given, without local filtering. Called
   * once typing pauses (see `onSearchChangeDebounceMs`). Picking a suggestion doesn't search: its
   * text came from the results already shown; use `onOptionSubmit` to load more about it. The
   * signal aborts when a newer search starts, so pass it to fetch to drop stale responses.
   */
  onSearchChange?: (value: string, signal: AbortSignal) => void;
  /** How long typing must pause before `onSearchChange` is called, in ms. Default 300; 0 calls on every keystroke. */
  onSearchChangeDebounceMs?: number;
  /** Text shorter than this is not sent to `onSearchChange`, e.g. 3 for trigram search. */
  onSearchChangeMinLength?: number;
  /** Shown while the text is shorter than `onSearchChangeMinLength`. Default "Type at least N characters". */
  searchMinLengthMessage?: string;
}

export function Autocomplete(props: AutocompleteProps) {
  const [, inputProps] = splitProps(props, [
    "options",
    "value",
    "defaultValue",
    "loading",
    "nothingFoundMessage",
    "renderOption",
    "chevronIcon",
    "onChange",
    "onOptionSubmit",
    "onSearchChange",
    "onSearchChangeDebounceMs",
    "onSearchChangeMinLength",
    "searchMinLengthMessage",
    "onFocus",
    "onKeyDown",
    "ref",
    "class"
  ]);
  const generatedId = createUniqueId();
  const inputId = () => props.id ?? `bx-autocomplete-${generatedId}`;
  const listboxId = () => `${inputId()}-listbox`;
  const isReadOnly = useReadOnly(() => props.readOnly === true);
  const [open, setOpen] = createSignal(false);
  const [activeIndex, setActiveIndex] = createSignal(-1);
  const text = createControllableSignal<string>({
    value: () => props.value,
    defaultValue: () => props.defaultValue ?? ""
  });
  let inputRef: HTMLInputElement | undefined;
  let dropdownRef: HTMLDivElement | undefined;

  onFormReset(() => inputRef, text.reset);
  const serverSearch = createSearchCall({
    callback: () => props.onSearchChange,
    delay: () => props.onSearchChangeDebounceMs,
    minLength: () => props.onSearchChangeMinLength
  });
  // Too short to search the server: the dropdown asks for more instead of showing stale options.
  const hint = createMemo(() =>
    props.onSearchChange && serverSearch.tooShort(text.value())
      ? minLengthHint(props.onSearchChangeMinLength, props.searchMinLengthMessage)
      : undefined
  );
  // What the event handlers read, as memos: a handler has no reactive owner, and reading a prop
  // written as a condition (`disabled={a() && b()}`) there would make Solid create a computation
  // that is never disposed.
  const disabled = createMemo(() => props.disabled === true);

  const visibleOptions = createMemo(() => {
    const search = text.value().trim().toLocaleLowerCase();
    if (props.onSearchChange || !search) return props.options;
    return props.options.filter(option =>
      `${option.label} ${option.description ?? ""}`.toLocaleLowerCase().includes(search)
    );
  });

  const firstEnabledIndex = () => visibleOptions().findIndex(option => !option.disabled);
  // Open only with something to show: suggestions, the min-length hint, or a nothing-found
  // message the app asked for (not while a search that may still find something is running).
  const showNothingFound = createMemo(
    () => visibleOptions().length === 0 && props.nothingFoundMessage !== undefined && !props.loading
  );
  const panelOpen = createMemo(
    () => open() && (visibleOptions().length > 0 || !!hint() || showNothingFound())
  );

  // Nothing is highlighted until the arrow keys move there: the field takes free text, so Enter
  // must keep what was typed rather than swap in the first suggestion.
  createEffect(() => {
    visibleOptions();
    setActiveIndex(-1);
  });

  const openDropdown = () => {
    if (disabled() || isReadOnly()) return;
    setOpen(true);
  };

  const closeDropdown = () => {
    setOpen(false);
    setActiveIndex(-1);
  };

  const setText = (value: string) => {
    text.setValue(value);
    props.onChange?.(value);
  };

  const submitOption = (option: SelectOption) => {
    if (option.disabled || disabled() || isReadOnly()) return;
    setText(option.label);
    // No search for a picked suggestion, and none for the text typed before it either.
    serverSearch.drop();
    props.onOptionSubmit?.(option);
    closeDropdown();
    inputRef?.focus();
  };

  /** Keeps the option the keyboard moved to in view; hover doesn't call it, so the list holds still. */
  const scrollActiveIntoView = () => {
    const option = dropdownRef?.querySelectorAll<HTMLElement>("[role='option']")[activeIndex()];
    option?.scrollIntoView({ block: "nearest" });
  };

  const moveActive = (direction: 1 | -1) => {
    const options = visibleOptions();
    if (!options.some(option => !option.disabled)) return;
    // From nothing highlighted, ArrowDown lands on the first option and ArrowUp on the last.
    let next = activeIndex() < 0 && direction === -1 ? 0 : activeIndex();
    do {
      next = (next + direction + options.length) % options.length;
    } while (options[next]?.disabled);
    setActiveIndex(next);
    scrollActiveIntoView();
  };

  const handleKeyDown: JSX.EventHandler<HTMLInputElement, KeyboardEvent> = event => {
    if (typeof props.onKeyDown === "function") props.onKeyDown(event);
    if (event.defaultPrevented || disabled() || isReadOnly()) return;

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      openDropdown();
      moveActive(event.key === "ArrowDown" ? 1 : -1);
      return;
    }
    if (event.key === "Home" && open()) {
      event.preventDefault();
      setActiveIndex(firstEnabledIndex());
      scrollActiveIntoView();
      return;
    }
    if (event.key === "End" && open()) {
      event.preventDefault();
      setActiveIndex(visibleOptions().findLastIndex(option => !option.disabled));
      scrollActiveIntoView();
      return;
    }
    if (event.key === "Enter" && open()) {
      const option = visibleOptions()[activeIndex()];
      if (option) {
        event.preventDefault();
        submitOption(option);
      }
      return;
    }
    if (event.key === "Escape" && open()) {
      // Claimed only when it closed something visible, so a modal behind still gets it otherwise.
      if (panelOpen()) event.preventDefault();
      closeDropdown();
    }
    if (event.key === "Tab") closeDropdown();
  };

  const closeOnOutsideClick = (event: MouseEvent) => {
    const target = event.target as Node;
    const field = inputRef?.closest(".bx-Autocomplete");
    if (!field?.contains(target) && !dropdownRef?.contains(target)) closeDropdown();
  };

  createEffect(() => {
    if (!open()) return;
    document.addEventListener("mousedown", closeOnOutsideClick);
    onCleanup(() => document.removeEventListener("mousedown", closeOnOutsideClick));
  });

  return (
    <>
      <Input
        {...inputProps}
        id={inputId()}
        class={props.class ? `bx-Autocomplete ${props.class}` : "bx-Autocomplete"}
        value={text.value()}
        role="combobox"
        autocomplete="off"
        aria-autocomplete="list"
        aria-controls={listboxId()}
        aria-expanded={panelOpen()}
        aria-activedescendant={
          panelOpen() && !hint() && activeIndex() >= 0
            ? `${listboxId()}-${activeIndex()}`
            : undefined
        }
        ref={element => {
          inputRef = element;
          props.ref?.(element);
        }}
        onInput={event => {
          setText(event.currentTarget.value);
          serverSearch.schedule(event.currentTarget.value);
          openDropdown();
        }}
        onFocus={event => {
          if (typeof props.onFocus === "function") props.onFocus(event);
          if (!event.defaultPrevented) openDropdown();
        }}
        onKeyDown={handleKeyDown}
        rightSection={
          // Hidden: the spinner only appears, which screen readers don't reliably announce, so
          // the live region below says it instead.
          <span
            class="bx-Autocomplete-indicator"
            data-expanded={open() ? "" : undefined}
            aria-hidden="true"
          >
            <Show when={!props.loading} fallback={<Loader size="xs" />}>
              {props.chevronIcon ?? <ChevronDownIcon />}
            </Show>
          </span>
        }
      />
      {/* Always on the page, so changing its text is announced. */}
      <span class="bx-visually-hidden" role="status">
        {props.loading ? "Loading suggestions…" : ""}
      </span>
      <FloatingPanel
        open={panelOpen()}
        target={() => inputRef}
        matchTargetWidth
        ref={element => (dropdownRef = element)}
        class="bx-Dropdown bx-Combobox-dropdown"
        onClick={event => event.stopPropagation()}
      >
        {/* The same scrolling list as Select: at most 18rem tall, and it keeps its own scroll. */}
        <ScrollArea class="bx-Combobox-scroll" viewportClass="bx-Combobox-viewport" scrollbars="y">
          <ComboboxState
            empty={showNothingFound()}
            nothingFoundMessage={props.nothingFoundMessage}
            hint={hint()}
          />
          <div
            id={listboxId()}
            class="bx-Combobox-options"
            role="listbox"
            aria-label={typeof props.label === "string" ? props.label : props["aria-label"]}
          >
            <Show when={!hint()}>
              <For each={visibleOptions()}>
                {(option, index) => (
                  <div
                    id={`${listboxId()}-${index()}`}
                    class="bx-Combobox-option"
                    data-active={index() === activeIndex() ? "" : undefined}
                    data-disabled={option.disabled ? "" : undefined}
                    role="option"
                    aria-selected={index() === activeIndex()}
                    aria-disabled={option.disabled}
                    onMouseEnter={() => !option.disabled && setActiveIndex(index())}
                    onMouseDown={event => event.preventDefault()}
                    onClick={() => submitOption(option)}
                  >
                    <ComboboxOptionContent option={option} render={props.renderOption} />
                  </div>
                )}
              </For>
            </Show>
          </div>
        </ScrollArea>
      </FloatingPanel>
    </>
  );
}
