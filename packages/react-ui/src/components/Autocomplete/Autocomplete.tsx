"use client";

import {
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState
} from "react";

import { ChevronDownIcon } from "../../icons";
import { useSearchCall } from "../../utils/debounce";
import { useControllableState, useFormReset, useLatest } from "../../utils/form";
import { useMergedRefs } from "../../utils/refs";
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
  renderOption?: (option: SelectOption) => ReactNode;
  /** Replaces the chevron at the end of the field. */
  chevronIcon?: ReactNode;
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

export function Autocomplete({
  options,
  value,
  defaultValue,
  loading,
  nothingFoundMessage,
  renderOption,
  chevronIcon,
  onChange,
  onOptionSubmit,
  onSearchChange,
  onSearchChangeDebounceMs,
  onSearchChangeMinLength,
  searchMinLengthMessage,
  onFocus,
  onKeyDown,
  ref,
  className,
  ...inputProps
}: AutocompleteProps) {
  const generatedId = useId();
  const inputId = inputProps.id ?? `bx-autocomplete-${generatedId}`;
  const listboxId = `${inputId}-listbox`;
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const text = useControllableState<string>({ value, defaultValue: defaultValue ?? "" });
  const input = useRef<HTMLInputElement>(null);
  const inputRef = useMergedRefs(input, ref);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const serverSearch = useSearchCall({
    callback: onSearchChange,
    delay: onSearchChangeDebounceMs,
    minLength: onSearchChangeMinLength
  });
  useFormReset(input, () => {
    text.reset();
    // A search for the text typed before the reset would bring back its suggestions.
    serverSearch.cancel();
  });
  // Too short to search the server: the dropdown asks for more instead of showing stale options.
  const hint =
    onSearchChange && serverSearch.tooShort(text.value)
      ? minLengthHint(onSearchChangeMinLength, searchMinLengthMessage)
      : undefined;

  const visibleOptions = useMemo(() => {
    const search = text.value.trim().toLocaleLowerCase();
    if (onSearchChange || !search) return options;
    return options.filter(option =>
      `${option.label} ${option.description ?? ""}`.toLocaleLowerCase().includes(search)
    );
  }, [text.value, onSearchChange, options]);

  const firstEnabledIndex = visibleOptions.findIndex(option => !option.disabled);
  // Open only with something to show: suggestions, the min-length hint, or a nothing-found
  // message the app asked for (not while a search that may still find something is running).
  const showNothingFound =
    visibleOptions.length === 0 && nothingFoundMessage !== undefined && !loading;
  const panelOpen = open && (visibleOptions.length > 0 || !!hint || showNothingFound);

  // Nothing is highlighted until the arrow keys move there: the field takes free text, so Enter
  // must keep what was typed rather than swap in the first suggestion.
  useEffect(() => {
    setActiveIndex(-1);
  }, [visibleOptions]);

  const isReadOnly = useReadOnly(inputProps.readOnly);
  const blocked = inputProps.disabled || isReadOnly;

  const openDropdown = () => {
    if (blocked) return;
    setOpen(true);
  };

  const closeDropdown = () => {
    setOpen(false);
    setActiveIndex(-1);
  };

  const setText = (next: string) => {
    text.setValue(next);
    onChange?.(next);
  };

  // Turned read-only or disabled while open (e.g. a form leaving edit mode): the list goes too.
  useEffect(() => {
    if (blocked) setOpen(false);
  }, [blocked]);

  const submitOption = (option: SelectOption) => {
    if (option.disabled || blocked) return;
    setText(option.label);
    // No search for a picked suggestion, and none for the text typed before it either.
    serverSearch.drop();
    onOptionSubmit?.(option);
    closeDropdown();
    input.current?.focus();
  };

  /** Keeps the option the keyboard moved to in view; hover doesn't call it, so the list holds still. */
  const scrollIntoView = (index: number) => {
    const option = dropdownRef.current?.querySelectorAll<HTMLElement>("[role='option']")[index];
    option?.scrollIntoView({ block: "nearest" });
  };

  const highlight = (index: number) => {
    setActiveIndex(index);
    scrollIntoView(index);
  };

  const moveActive = (direction: 1 | -1) => {
    // The hint replaces the options, so there is nothing to move to (and Enter to pick).
    if (hint || !visibleOptions.some(option => !option.disabled)) return;
    // From nothing highlighted, ArrowDown lands on the first option and ArrowUp on the last.
    let next = activeIndex < 0 && direction === -1 ? 0 : activeIndex;
    do {
      next = (next + direction + visibleOptions.length) % visibleOptions.length;
    } while (visibleOptions[next]?.disabled);
    highlight(next);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented || blocked) return;

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      openDropdown();
      moveActive(event.key === "ArrowDown" ? 1 : -1);
      return;
    }
    if (event.key === "Home" && open) {
      event.preventDefault();
      highlight(firstEnabledIndex);
      return;
    }
    if (event.key === "End" && open) {
      event.preventDefault();
      highlight(visibleOptions.findLastIndex(option => !option.disabled));
      return;
    }
    if (event.key === "Enter" && open) {
      const option = hint ? undefined : visibleOptions[activeIndex];
      if (option) {
        event.preventDefault();
        submitOption(option);
      }
      return;
    }
    if (event.key === "Escape" && open) {
      // Claimed only when it closed something visible, so a modal behind still gets it otherwise.
      if (panelOpen) event.preventDefault();
      closeDropdown();
    }
    if (event.key === "Tab") closeDropdown();
  };

  const closeRef = useLatest(closeDropdown);
  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: globalThis.MouseEvent) => {
      const target = event.target as Node;
      const field = input.current?.closest(".bx-Autocomplete");
      if (!field?.contains(target) && !dropdownRef.current?.contains(target)) closeRef.current();
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [open, closeRef]);

  return (
    <>
      <Input
        {...inputProps}
        id={inputId}
        className={className ? `bx-Autocomplete ${className}` : "bx-Autocomplete"}
        value={text.value}
        role="combobox"
        autoComplete="off"
        aria-autocomplete="list"
        aria-controls={listboxId}
        aria-expanded={panelOpen}
        aria-activedescendant={
          panelOpen && !hint && activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined
        }
        ref={inputRef}
        onChange={event => {
          setText(event.currentTarget.value);
          serverSearch.schedule(event.currentTarget.value);
          openDropdown();
        }}
        onFocus={event => {
          onFocus?.(event);
          if (!event.defaultPrevented) openDropdown();
        }}
        onKeyDown={handleKeyDown}
        rightSection={
          // Hidden: the spinner only appears, which screen readers don't reliably announce, so
          // the live region below says it instead.
          <span
            className="bx-Autocomplete-indicator"
            data-expanded={open ? "" : undefined}
            aria-hidden="true"
          >
            {loading ? <Loader size="xs" /> : (chevronIcon ?? <ChevronDownIcon />)}
          </span>
        }
      />
      {/* Always on the page, so changing its text is announced. */}
      <span className="bx-visually-hidden" role="status">
        {loading ? "Loading suggestions…" : ""}
      </span>
      <FloatingPanel
        open={panelOpen}
        target={input}
        matchTargetWidth
        ref={element => (dropdownRef.current = element)}
        className="bx-Dropdown bx-Combobox-dropdown"
        onClick={event => event.stopPropagation()}
      >
        {/* The same scrolling list as Select: at most 18rem tall, and it keeps its own scroll. */}
        <ScrollArea
          className="bx-Combobox-scroll"
          viewportClassName="bx-Combobox-viewport"
          scrollbars="y"
        >
          <ComboboxState
            empty={showNothingFound}
            nothingFoundMessage={nothingFoundMessage}
            hint={hint}
          />
          <div
            id={listboxId}
            className="bx-Combobox-options"
            role="listbox"
            aria-label={
              typeof inputProps.label === "string" ? inputProps.label : inputProps["aria-label"]
            }
          >
            {!hint &&
              visibleOptions.map((option, index) => (
                <div
                  key={option.value}
                  id={`${listboxId}-${index}`}
                  className="bx-Combobox-option"
                  data-active={index === activeIndex ? "" : undefined}
                  data-disabled={option.disabled ? "" : undefined}
                  role="option"
                  aria-selected={index === activeIndex}
                  aria-disabled={option.disabled}
                  onMouseEnter={() => !option.disabled && setActiveIndex(index)}
                  onMouseDown={event => event.preventDefault()}
                  onClick={() => submitOption(option)}
                >
                  <ComboboxOptionContent option={option} render={renderOption} />
                </div>
              ))}
          </div>
        </ScrollArea>
      </FloatingPanel>
    </>
  );
}
