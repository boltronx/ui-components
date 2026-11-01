"use client";

import {
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState
} from "react";

import { CheckIcon, ChevronDownIcon, CloseIcon } from "../../icons";
import { useSearchCall } from "../../utils/debounce";
import { useControllableState, useFormReset, useLatest } from "../../utils/form";
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
  renderOption?: (option: SelectOption) => ReactNode;
  /** Replaces the chevron at the end of the field. */
  chevronIcon?: ReactNode;
  /** Replaces the cross on the clear button and on each chip's remove button. */
  clearIcon?: ReactNode;
  /** Replaces the check next to picked options in the dropdown. */
  checkIcon?: ReactNode;
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

/** The first option that can be picked, or 0 when none can. */
function firstEnabledIndex(options: SelectOption[]): number {
  return Math.max(
    0,
    options.findIndex(option => !option.disabled)
  );
}

function normalizeValue(value: SelectValue | undefined, multiple: boolean): string[] {
  if (Array.isArray(value)) return multiple ? value : value.slice(0, 1);
  return value ? [value] : [];
}

export function Select(props: SelectProps) {
  const generatedId = useId();
  const controlId = props.id ?? `bx-select-${generatedId}`;
  const listboxId = `${controlId}-listbox`;
  const optionId = (index: number) => `${listboxId}-${index}`;
  // The combobox is a div, which a <label for> cannot name, so the label is linked by id instead.
  const labelId = `${controlId}-label`;
  const isMultiple = props.multiple === true;
  const isReadOnly = useReadOnly(props.readOnly);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const selection = useControllableState<string[]>({
    value: props.value === undefined ? undefined : normalizeValue(props.value, isMultiple),
    defaultValue: normalizeValue(props.defaultValue, isMultiple)
  });
  const selectedValues = selection.value;
  // Options seen so far, so a picked value keeps its label while a server search narrows options.
  const optionCache = useRef(new Map<string, SelectOption>());
  for (const option of props.options) optionCache.current.set(option.value, option);
  const [hasLoadedOptions, setHasLoadedOptions] = useState(!props.loading);
  if (!props.loading && !hasLoadedOptions) setHasLoadedOptions(true);
  const rootRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useFormReset(rootRef, selection.reset);
  const serverSearch = useSearchCall({
    callback: props.onSearchChange,
    delay: props.onSearchChangeDebounceMs,
    minLength: props.onSearchChangeMinLength
  });
  // Too short to search the server: the dropdown asks for more instead of showing stale options.
  const hint =
    props.onSearchChange && serverSearch.tooShort(search)
      ? minLengthHint(props.onSearchChangeMinLength, props.searchMinLengthMessage)
      : undefined;

  const blocked = props.disabled || isReadOnly;
  useEffect(() => {
    if (!blocked) return;
    setOpen(false);
    setSearch("");
  }, [blocked]);

  useEffect(() => {
    if (props.autoFocus) rootRef.current?.focus();
    // Only on mount, like the native autofocus.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedOptions = selectedValues
    .map(value => optionCache.current.get(value))
    .filter((option): option is SelectOption => option !== undefined);

  const visibleOptions = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    if (!props.searchable || props.onSearchChange || !query) return props.options;
    return props.options.filter(option =>
      `${option.label} ${option.description ?? ""}`.toLocaleLowerCase().includes(query)
    );
  }, [search, props.searchable, props.onSearchChange, props.options]);

  // Focus stays on the field (or the search), so the highlighted option is announced through this.
  const activeDescendant =
    open && !props.loading && !hint && activeIndex < visibleOptions.length
      ? optionId(activeIndex)
      : undefined;

  const showsChips = isMultiple && !props.ellipsis;
  const displayValue = showsChips ? "" : selectedOptions.map(option => option.label).join(", ");

  const latest = useLatest({ open, activeIndex, searchable: props.searchable });
  const scrollActiveIntoView = useCallback(
    (index = latest.current.activeIndex) => {
      const option = dropdownRef.current?.querySelectorAll<HTMLElement>("[role='option']")[index];
      option?.scrollIntoView({ block: "nearest" });
    },
    [latest]
  );

  const close = () => {
    setOpen(false);
    props.onDropdownClose?.();
    setSearch("");
    serverSearch.now("");
  };
  const closeRef = useLatest(close);

  const openDropdown = () => {
    if (blocked) return;
    setOpen(true);
    props.onDropdownOpen?.();
    const selectedIndex = visibleOptions.findIndex(option => selectedValues.includes(option.value));
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : firstEnabledIndex(visibleOptions));
  };

  const commit = (next: string[], option: SelectOption | undefined) => {
    selection.setValue(next);
    props.onChange?.(isMultiple ? next : (next[0] ?? ""), option);
  };

  const pick = (option: SelectOption) => {
    if (blocked || option.disabled) return;
    if (isMultiple) {
      commit(
        selectedValues.includes(option.value)
          ? selectedValues.filter(value => value !== option.value)
          : [...selectedValues, option.value],
        option
      );
      return;
    }
    if (!selectedValues.includes(option.value)) commit([option.value], option);
    close();
  };

  const removeValue = (value: string, event: MouseEvent) => {
    event.stopPropagation();
    commit(
      selectedValues.filter(selected => selected !== value),
      optionCache.current.get(value)
    );
  };

  const canClear = props.clearable === true && !showsChips && !blocked && selectedValues.length > 0;

  const clearValue = () => {
    commit([], optionCache.current.get(selectedValues[0] ?? ""));
    close();
    rootRef.current?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (blocked) return;
    // A chip's remove button keeps its own Enter and Space, which bubble up from inside the field.
    if (
      (event.key === "Enter" || event.key === " ") &&
      (event.target as Element).closest(".bx-Select-chipRemove")
    ) {
      return;
    }
    if (!open && (event.key === "Backspace" || event.key === "Delete") && canClear) {
      event.preventDefault();
      clearValue();
      return;
    }
    if (!open && ["Enter", " ", "ArrowDown"].includes(event.key)) {
      event.preventDefault();
      openDropdown();
      return;
    }
    if (!open) return;
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      rootRef.current?.focus();
      return;
    }
    if (event.key === "Tab") {
      close();
      // The search sits in the dropdown at the end of <body>. Focus goes back to the field first,
      // so the browser's Tab moves on from there to the next field, not off the page.
      if (event.currentTarget !== rootRef.current) rootRef.current?.focus();
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const direction = event.key === "ArrowDown" ? 1 : -1;
      const count = visibleOptions.length;
      // Disabled options can't be picked, so the keyboard passes over them.
      if (!visibleOptions.some(option => !option.disabled)) return;
      let next = activeIndex;
      do {
        next = (next + direction + count) % count;
      } while (visibleOptions[next]?.disabled);
      setActiveIndex(next);
      scrollActiveIntoView(next);
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      // Not while loading or asking for more characters: the options are hidden then.
      const option = activeDescendant ? visibleOptions[activeIndex] : undefined;
      if (option) pick(option);
    }
  };

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: globalThis.MouseEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !dropdownRef.current?.contains(target)) {
        closeRef.current();
      }
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [open, closeRef]);

  const setDropdown = useCallback((element: HTMLDivElement | null) => {
    dropdownRef.current = element;
  }, []);

  // Once the dropdown is placed and visible, so it can take focus.
  const handleDropdownOpen = useCallback(
    (element: HTMLDivElement) => {
      // Opening on a selected option further down the list should show it.
      scrollActiveIntoView();
      if (latest.current.searchable) element.querySelector<HTMLInputElement>("input")?.focus();
    },
    [latest, scrollActiveIntoView]
  );

  // A single select always submits one entry (empty when nothing is picked), like a native input.
  const submittedValues = isMultiple ? selectedValues : [selectedValues[0] ?? ""];

  return (
    <Field
      id={controlId}
      labelId={labelId}
      onLabelClick={() => rootRef.current?.focus()}
      label={props.label}
      description={props.description}
      error={props.error}
      required={props.required}
      className={props.className ? `bx-Select ${props.className}` : "bx-Select"}
      style={props.style}
    >
      <div
        ref={rootRef}
        id={controlId}
        className="bx-Input-control bx-Select-control"
        data-expanded={open ? "" : undefined}
        data-disabled={props.disabled ? "" : undefined}
        data-readonly={isReadOnly ? "" : undefined}
        data-chips={showsChips ? "" : undefined}
        role="combobox"
        aria-labelledby={props.label ? labelId : undefined}
        aria-label={props.label ? undefined : props["aria-label"]}
        aria-describedby={describedBy(controlId, props)}
        aria-invalid={props.error ? true : undefined}
        aria-controls={listboxId}
        aria-expanded={open}
        aria-activedescendant={activeDescendant}
        aria-haspopup="listbox"
        aria-disabled={props.disabled}
        aria-readonly={isReadOnly}
        aria-required={props.required}
        tabIndex={props.disabled ? -1 : 0}
        onClick={() => (open ? undefined : openDropdown())}
        onKeyDown={handleKeyDown}
      >
        <div className="bx-Select-value">
          {showsChips ? (
            <>
              {selectedOptions.map(option => (
                <span key={option.value} className="bx-Select-chip">
                  {option.label}
                  {!isReadOnly && (
                    <button
                      type="button"
                      className="bx-Select-chipRemove"
                      aria-label={`Remove ${option.label}`}
                      disabled={props.disabled}
                      onClick={event => removeValue(option.value, event)}
                    >
                      {props.clearIcon ?? <CloseIcon />}
                    </button>
                  )}
                </span>
              ))}
              {selectedOptions.length === 0 && (
                <span className="bx-Select-placeholder">{props.placeholder}</span>
              )}
            </>
          ) : (
            <span
              className={displayValue ? "bx-Select-text" : "bx-Select-placeholder"}
              title={displayValue || undefined}
            >
              {displayValue || props.placeholder}
            </span>
          )}
        </div>
        {canClear ? (
          <button
            type="button"
            className="bx-Select-clear"
            aria-label={props["aria-label"] ? `Clear ${props["aria-label"]}` : "Clear"}
            tabIndex={-1}
            onMouseDown={event => event.preventDefault()}
            onClick={event => {
              event.stopPropagation();
              clearValue();
            }}
          >
            {props.clearIcon ?? <CloseIcon />}
          </button>
        ) : (
          <span className="bx-Select-chevron">
            {!props.loading || hasLoadedOptions ? (
              (props.chevronIcon ?? <ChevronDownIcon />)
            ) : (
              <Loader size="xs" />
            )}
          </span>
        )}
      </div>
      <FloatingPanel
        open={open}
        target={rootRef}
        matchTargetWidth
        minWidth={props.dropdownMinWidth}
        ref={setDropdown}
        onOpen={handleDropdownOpen}
        className="bx-Dropdown bx-Combobox-dropdown"
        onClick={event => event.stopPropagation()}
      >
        {props.searchable && (
          <InputSearch
            className="bx-Combobox-search"
            value={search}
            placeholder={props.searchPlaceholder ?? "Search..."}
            aria-label="Search options"
            aria-controls={listboxId}
            aria-activedescendant={activeDescendant}
            onChange={event => {
              const value = event.currentTarget.value;
              setSearch(value);
              setActiveIndex(0);
              serverSearch.schedule(value);
            }}
            onKeyDown={handleKeyDown}
          />
        )}
        <ScrollArea
          className="bx-Combobox-scroll"
          viewportClassName="bx-Combobox-viewport"
          scrollbars="y"
        >
          <ComboboxState
            loading={props.loading}
            empty={visibleOptions.length === 0}
            nothingFoundMessage={props.nothingFoundMessage}
            hint={hint}
          />
          <div
            id={listboxId}
            className="bx-Combobox-options"
            role="listbox"
            aria-labelledby={props.label ? labelId : undefined}
            aria-label={props.label ? undefined : props["aria-label"]}
            aria-multiselectable={isMultiple}
          >
            {!props.loading &&
              !hint &&
              visibleOptions.map((option, index) => {
                const selected = selectedValues.includes(option.value);
                return (
                  <div
                    key={option.value}
                    id={optionId(index)}
                    className="bx-Combobox-option"
                    data-active={index === activeIndex ? "" : undefined}
                    data-selected={selected ? "" : undefined}
                    data-disabled={option.disabled ? "" : undefined}
                    role="option"
                    aria-selected={selected}
                    aria-disabled={option.disabled}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => pick(option)}
                  >
                    <ComboboxOptionContent option={option} render={props.renderOption} />
                    {selected && (
                      <span className="bx-Combobox-check">{props.checkIcon ?? <CheckIcon />}</span>
                    )}
                  </div>
                );
              })}
          </div>
        </ScrollArea>
      </FloatingPanel>
      {submittedValues.map((value, index) => (
        <input
          key={index}
          type="hidden"
          name={props.name}
          value={value}
          disabled={props.disabled}
        />
      ))}
      {/*
        `required` is checked by a native <select> with a single option holding the value: the
        browser then validates it like any select, with its own "Please select an item" message,
        in order with the other fields. A reset cannot change a single option, so nothing has to
        be restored. When validation focuses it, focus moves on to the combobox.
      */}
      <select
        className="bx-Select-validator"
        required={props.required}
        disabled={props.disabled}
        tabIndex={-1}
        aria-hidden="true"
        onFocus={() => rootRef.current?.focus()}
      >
        <option value={selectedValues[0] ?? ""} />
      </select>
    </Field>
  );
}
