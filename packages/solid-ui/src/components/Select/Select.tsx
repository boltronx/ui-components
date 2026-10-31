import type { JSX } from "solid-js";
import {
  createEffect,
  createMemo,
  createSignal,
  createUniqueId,
  For,
  onCleanup,
  Show,
  untrack
} from "solid-js";

import { CheckIcon, ChevronDownIcon, CloseIcon } from "../../icons";
import { createSearchCall } from "../../utils/debounce";
import { createControllableSignal, onFormReset } from "../../utils/form";
import type { BaseProps } from "../../utils/style";
import { ComboboxOptionContent, ComboboxState, minLengthHint } from "../Combobox/Combobox";
import { describedBy, Field, type FieldOwnProps } from "../Field/Field";
import { FloatingPanel } from "../FloatingPanel/FloatingPanel";
import { InputSearch } from "../InputSearch/InputSearch";
import { Loader } from "../Loader/Loader";
import { useReadOnly } from "../ReadOnly/ReadOnly";
import { ScrollArea } from "../ScrollArea/ScrollArea";

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

export type SelectValue = string | string[];

export interface SelectProps extends FieldOwnProps, BaseProps {
  id?: string;
  /** Submitted with the form: one entry per picked value (read them with `formData.getAll`). */
  name?: string;
  options: SelectOption[];
  /** Controlled value. The parent owns it; a form reset leaves it in place. */
  value?: SelectValue;
  /** Uncontrolled starting value; a form reset restores it. */
  defaultValue?: SelectValue;
  multiple?: boolean;
  searchable?: boolean;
  /** A single select shows a clear button in place of its chevron while it has a value. */
  clearable?: boolean;
  /**
   * A multiple select lists its picks as one line of text, cut with an ellipsis, instead of chips
   * that grow the field. Picks are removed in the dropdown, or all at once with `clearable`.
   */
  ellipsis?: boolean;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  autoFocus?: boolean;
  loading?: boolean;
  /** The dropdown follows the field's width but is never narrower than this, in px. */
  dropdownMinWidth?: number;
  searchPlaceholder?: string;
  nothingFoundMessage?: string;
  renderOption?: (option: SelectOption) => JSX.Element;
  /** Replaces the chevron at the end of the field. */
  chevronIcon?: JSX.Element;
  /** Replaces the cross on the clear button and on each chip's remove button. */
  clearIcon?: JSX.Element;
  /** Replaces the check next to picked options in the dropdown. */
  checkIcon?: JSX.Element;
  "aria-label"?: string;
  /** A single select reports a string ("" when cleared), a multiple select an array. */
  onChange?: (value: SelectValue, option: SelectOption | undefined) => void;
  /**
   * Set to search on the server: options are then shown as given, without local filtering. Called
   * once typing pauses (see `onSearchChangeDebounceMs`), and with "" when the dropdown closes. The
   * signal aborts when a newer search starts, so pass it to fetch to drop stale responses.
   */
  onSearchChange?: (value: string, signal: AbortSignal) => void;
  /** How long typing must pause before `onSearchChange` is called, in ms. Default 300; 0 calls on every keystroke. */
  onSearchChangeDebounceMs?: number;
  /** Search text shorter than this is not sent to `onSearchChange`, e.g. 3 for trigram search. */
  onSearchChangeMinLength?: number;
  /** Shown while the search is shorter than `onSearchChangeMinLength`. Default "Type at least N characters". */
  searchMinLengthMessage?: string;
  /** Lets options load on demand, e.g. on the first open instead of on mount. */
  onDropdownOpen?: () => void;
  /** Called before the search is cleared, so a reset search can tell it came from closing. */
  onDropdownClose?: () => void;
}

function normalizeValue(value: SelectValue | undefined, multiple: boolean): string[] {
  if (Array.isArray(value)) return multiple ? value : value.slice(0, 1);
  return value ? [value] : [];
}

export function Select(props: SelectProps) {
  const generatedId = createUniqueId();
  const controlId = () => props.id ?? `bx-select-${generatedId}`;
  const listboxId = () => `${controlId()}-listbox`;
  const optionId = (index: number) => `${listboxId()}-${index}`;
  // The combobox is a div, which a <label for> cannot name, so the label is linked by id instead.
  const labelId = () => `${controlId()}-label`;
  // What the event handlers read, as memos: a handler has no reactive owner, and reading a prop
  // written as a condition (`disabled={a() && b()}`) there would make Solid create a computation
  // that is never disposed.
  const isMultiple = createMemo(() => props.multiple === true);
  const disabled = createMemo(() => props.disabled === true);
  const isReadOnly = useReadOnly(() => props.readOnly === true);
  const [open, setOpen] = createSignal(false);
  const [search, setSearch] = createSignal("");
  const [activeIndex, setActiveIndex] = createSignal(0);
  const selection = createControllableSignal<string[]>({
    value: () =>
      props.value === undefined ? undefined : normalizeValue(props.value, isMultiple()),
    defaultValue: () => normalizeValue(props.defaultValue, isMultiple())
  });
  const selectedValues = selection.value;
  // Options seen so far, so a picked value keeps its label while a server search narrows options.
  const [optionCache, setOptionCache] = createSignal(untrack(() => props.options));
  const [hasLoadedOptions, setHasLoadedOptions] = createSignal(!untrack(() => props.loading));
  let rootRef: HTMLDivElement | undefined;
  let dropdownRef: HTMLDivElement | undefined;

  onFormReset(() => rootRef, selection.reset);
  const serverSearch = createSearchCall({
    callback: () => props.onSearchChange,
    delay: () => props.onSearchChangeDebounceMs,
    minLength: () => props.onSearchChangeMinLength
  });
  // Too short to search the server: the dropdown asks for more instead of showing stale options.
  const hint = () =>
    props.onSearchChange && serverSearch.tooShort(search())
      ? minLengthHint(props.onSearchChangeMinLength, props.searchMinLengthMessage)
      : undefined;

  createEffect(() => {
    const loadedOptions = props.options;
    // Only picked values need a remembered label, so a long server search doesn't pile up options.
    const picked = new Set(selectedValues());
    setOptionCache(current => {
      const merged = new Map(
        current.filter(option => picked.has(option.value)).map(option => [option.value, option])
      );
      for (const option of loadedOptions) merged.set(option.value, option);
      return [...merged.values()];
    });
  });

  createEffect(() => {
    if (!props.loading) setHasLoadedOptions(true);
  });

  createEffect(() => {
    if (!disabled() && !isReadOnly()) return;
    setOpen(false);
    setSearch("");
  });

  const selectedOptions = createMemo(() => {
    const byValue = new Map(optionCache().map(option => [option.value, option]));
    return selectedValues()
      .map(value => byValue.get(value))
      .filter((option): option is SelectOption => option !== undefined);
  });

  const visibleOptions = createMemo(() => {
    const query = search().trim().toLocaleLowerCase();
    if (!props.searchable || props.onSearchChange || !query) return props.options;
    return props.options.filter(option =>
      `${option.label} ${option.description ?? ""}`.toLocaleLowerCase().includes(query)
    );
  });

  // Focus stays on the field (or the search), so the highlighted option is announced through this.
  const activeDescendant = () =>
    open() && !props.loading && !hint() && activeIndex() < visibleOptions().length
      ? optionId(activeIndex())
      : undefined;

  const showsChips = createMemo(() => isMultiple() && !props.ellipsis);

  const displayValue = createMemo(() => {
    if (showsChips()) return "";
    return selectedOptions()
      .map(option => option.label)
      .join(", ");
  });

  const firstEnabledIndex = () => visibleOptions().findIndex(option => !option.disabled);

  const scrollActiveIntoView = () => {
    const option = dropdownRef?.querySelectorAll<HTMLElement>("[role='option']")[activeIndex()];
    option?.scrollIntoView({ block: "nearest" });
  };

  const close = () => {
    setOpen(false);
    props.onDropdownClose?.();
    setSearch("");
    serverSearch.now("");
  };

  const openDropdown = () => {
    if (disabled() || isReadOnly()) return;
    setOpen(true);
    props.onDropdownOpen?.();
    const selectedIndex = visibleOptions().findIndex(option =>
      selectedValues().includes(option.value)
    );
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : Math.max(0, firstEnabledIndex()));
  };

  const commit = (next: string[], option: SelectOption | undefined) => {
    selection.setValue(next);
    props.onChange?.(isMultiple() ? next : (next[0] ?? ""), option);
  };

  const pick = (option: SelectOption) => {
    if (disabled() || isReadOnly() || option.disabled) return;
    const current = selectedValues();
    if (isMultiple()) {
      commit(
        current.includes(option.value)
          ? current.filter(value => value !== option.value)
          : [...current, option.value],
        option
      );
      return;
    }
    if (!current.includes(option.value)) commit([option.value], option);
    close();
    // The search that had focus is gone with the dropdown, so focus goes back to the field.
    rootRef?.focus();
  };

  const removeValue = (value: string, event: MouseEvent) => {
    event.stopPropagation();
    const option = optionCache().find(item => item.value === value);
    commit(
      selectedValues().filter(selected => selected !== value),
      option
    );
  };

  const canClear = createMemo(
    () =>
      props.clearable === true &&
      !showsChips() &&
      !disabled() &&
      !isReadOnly() &&
      selectedValues().length > 0
  );

  const clearValue = () => {
    const option = optionCache().find(item => item.value === selectedValues()[0]);
    commit([], option);
    close();
    rootRef?.focus();
  };

  const handleKeyDown: JSX.EventHandler<HTMLElement, KeyboardEvent> = event => {
    if (disabled() || isReadOnly()) return;
    // A chip's remove button keeps its own Enter and Space, which bubble up from inside the field.
    if ((event.target as Element).closest(".bx-Select-chipRemove")) return;
    if (!open() && (event.key === "Backspace" || event.key === "Delete") && canClear()) {
      event.preventDefault();
      clearValue();
      return;
    }
    if (!open() && ["Enter", " ", "ArrowDown"].includes(event.key)) {
      event.preventDefault();
      openDropdown();
      return;
    }
    if (!open()) return;
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      rootRef?.focus();
      return;
    }
    if (event.key === "Tab") {
      close();
      // The search sits in the dropdown at the end of <body>. Focus goes back to the field first,
      // so the browser's Tab moves on from there to the next field, not off the page.
      if (event.currentTarget !== rootRef) rootRef?.focus();
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const direction = event.key === "ArrowDown" ? 1 : -1;
      const options = visibleOptions();
      // Disabled options can't be picked, so the keyboard passes over them.
      if (!options.some(option => !option.disabled)) return;
      let next = activeIndex();
      do {
        next = (next + direction + options.length) % options.length;
      } while (options[next]?.disabled);
      setActiveIndex(next);
      scrollActiveIntoView();
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const option = visibleOptions()[activeIndex()];
      if (option) pick(option);
    }
  };

  const closeOnOutsideClick = (event: MouseEvent) => {
    const target = event.target as Node;
    if (!rootRef?.contains(target) && !dropdownRef?.contains(target)) close();
  };

  createEffect(() => {
    if (!open()) return;
    document.addEventListener("mousedown", closeOnOutsideClick);
    onCleanup(() => document.removeEventListener("mousedown", closeOnOutsideClick));
  });

  // A single select always submits one entry (empty when nothing is picked), like a native input.
  const submittedValues = () => (isMultiple() ? selectedValues() : [selectedValues()[0] ?? ""]);

  return (
    <Field
      id={controlId()}
      labelId={labelId()}
      onLabelClick={() => rootRef?.focus()}
      label={props.label}
      description={props.description}
      error={props.error}
      required={props.required}
      class={props.class ? `bx-Select ${props.class}` : "bx-Select"}
      style={props.style}
    >
      <div
        ref={element => {
          rootRef = element;
          if (props.autoFocus) queueMicrotask(() => element.focus());
        }}
        id={controlId()}
        class="bx-Input-control bx-Select-control"
        data-expanded={open() ? "" : undefined}
        data-disabled={props.disabled ? "" : undefined}
        data-readonly={isReadOnly() ? "" : undefined}
        data-chips={showsChips() ? "" : undefined}
        role="combobox"
        aria-labelledby={props.label ? labelId() : undefined}
        aria-label={props.label ? undefined : props["aria-label"]}
        aria-describedby={describedBy(controlId(), props)}
        aria-invalid={props.error ? true : undefined}
        aria-controls={listboxId()}
        aria-expanded={open()}
        aria-activedescendant={activeDescendant()}
        aria-haspopup="listbox"
        aria-disabled={props.disabled}
        aria-readonly={isReadOnly()}
        aria-required={props.required}
        tabindex={props.disabled ? -1 : 0}
        onClick={() => (open() ? undefined : openDropdown())}
        onKeyDown={handleKeyDown}
      >
        <div class="bx-Select-value">
          <Show
            when={showsChips()}
            fallback={
              <span
                class={displayValue() ? "bx-Select-text" : "bx-Select-placeholder"}
                title={displayValue() || undefined}
              >
                {displayValue() || props.placeholder}
              </span>
            }
          >
            <For each={selectedOptions()}>
              {option => (
                <span class="bx-Select-chip">
                  {option.label}
                  <Show when={!isReadOnly()}>
                    <button
                      type="button"
                      class="bx-Select-chipRemove"
                      aria-label={`Remove ${option.label}`}
                      disabled={props.disabled}
                      onClick={event => removeValue(option.value, event)}
                    >
                      {props.clearIcon ?? <CloseIcon />}
                    </button>
                  </Show>
                </span>
              )}
            </For>
            <Show when={selectedOptions().length === 0}>
              <span class="bx-Select-placeholder">{props.placeholder}</span>
            </Show>
          </Show>
        </div>
        <Show
          when={canClear()}
          fallback={
            <span class="bx-Select-chevron">
              <Show when={!props.loading || hasLoadedOptions()} fallback={<Loader size="xs" />}>
                {props.chevronIcon ?? <ChevronDownIcon />}
              </Show>
            </span>
          }
        >
          <button
            type="button"
            class="bx-Select-clear"
            aria-label={props["aria-label"] ? `Clear ${props["aria-label"]}` : "Clear"}
            tabindex={-1}
            onMouseDown={event => event.preventDefault()}
            onClick={event => {
              event.stopPropagation();
              clearValue();
            }}
          >
            {props.clearIcon ?? <CloseIcon />}
          </button>
        </Show>
      </div>
      <FloatingPanel
        open={open()}
        target={() => rootRef}
        matchTargetWidth
        minWidth={props.dropdownMinWidth}
        ref={element => (dropdownRef = element)}
        onOpen={element => {
          // Opening on a selected option further down the list should show it.
          scrollActiveIntoView();
          if (props.searchable) element.querySelector<HTMLInputElement>("input")?.focus();
        }}
        class="bx-Dropdown bx-Combobox-dropdown"
        onClick={event => event.stopPropagation()}
      >
        <Show when={props.searchable}>
          <InputSearch
            class="bx-Combobox-search"
            value={search()}
            placeholder={props.searchPlaceholder ?? "Search..."}
            aria-label="Search options"
            aria-controls={listboxId()}
            aria-activedescendant={activeDescendant()}
            onInput={event => {
              const value = event.currentTarget.value;
              setSearch(value);
              setActiveIndex(0);
              serverSearch.schedule(value);
            }}
            onKeyDown={handleKeyDown}
          />
        </Show>
        <ScrollArea class="bx-Combobox-scroll" viewportClass="bx-Combobox-viewport" scrollbars="y">
          <ComboboxState
            loading={props.loading}
            empty={visibleOptions().length === 0}
            nothingFoundMessage={props.nothingFoundMessage}
            hint={hint()}
          />
          <div
            id={listboxId()}
            class="bx-Combobox-options"
            role="listbox"
            aria-labelledby={props.label ? labelId() : undefined}
            aria-label={props.label ? undefined : props["aria-label"]}
            aria-multiselectable={isMultiple()}
          >
            <Show when={!props.loading && !hint()}>
              <For each={visibleOptions()}>
                {(option, index) => {
                  const selected = () => selectedValues().includes(option.value);
                  return (
                    <div
                      id={optionId(index())}
                      class="bx-Combobox-option"
                      data-active={index() === activeIndex() ? "" : undefined}
                      data-selected={selected() ? "" : undefined}
                      data-disabled={option.disabled ? "" : undefined}
                      role="option"
                      aria-selected={selected()}
                      aria-disabled={option.disabled}
                      onMouseEnter={() => setActiveIndex(index())}
                      // Keeps focus in the field or the search while picking with the mouse.
                      onMouseDown={event => event.preventDefault()}
                      onClick={() => pick(option)}
                    >
                      <ComboboxOptionContent option={option} render={props.renderOption} />
                      <Show when={selected()}>
                        <span class="bx-Combobox-check">{props.checkIcon ?? <CheckIcon />}</span>
                      </Show>
                    </div>
                  );
                }}
              </For>
            </Show>
          </div>
        </ScrollArea>
      </FloatingPanel>
      <For each={submittedValues()}>
        {value => <input type="hidden" name={props.name} value={value} disabled={props.disabled} />}
      </For>
      {/*
        `required` is checked by a native <select> with a single option holding the value: the
        browser then validates it like any select, with its own "Please select an item" message,
        in order with the other fields. A reset cannot change a single option, so nothing has to
        be restored. When validation focuses it, focus moves on to the combobox.
      */}
      <select
        class="bx-Select-validator"
        required={props.required}
        disabled={props.disabled}
        tabindex={-1}
        aria-hidden="true"
        onFocus={() => rootRef?.focus()}
      >
        <option value={selectedValues()[0] ?? ""} />
      </select>
    </Field>
  );
}
