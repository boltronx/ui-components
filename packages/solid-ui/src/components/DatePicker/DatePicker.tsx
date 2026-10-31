import {
  createEffect,
  createMemo,
  createSignal,
  createUniqueId,
  For,
  type JSX,
  Match,
  onCleanup,
  splitProps,
  Switch
} from "solid-js";

import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon, CloseIcon } from "../../icons";
import { createControllableSignal, onFormReset } from "../../utils/form";
import { type BaseProps, cx } from "../../utils/style";
import type { FieldOwnProps } from "../Field/Field";
import { FloatingPanel } from "../FloatingPanel/FloatingPanel";
import { Input } from "../Input/Input";
import { useReadOnly } from "../ReadOnly/ReadOnly";

import {
  addDays,
  addMonths,
  calendarDays,
  decadeYears,
  parseISODate,
  toISODate,
  yearMonths
} from "./dates";

/** What the calendar shows: the days of a month, the months of a year or the years of a decade. */
type Level = "month" | "year" | "decade";

/** Keyboard steps per level, in the level's own unit (days, months or years). */
const LEVEL_MOVES: Record<Level, Record<string, number>> = {
  month: { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 },
  year: { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -3, ArrowDown: 3 },
  decade: { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -3, ArrowDown: 3 }
};

const DEFAULT_FORMAT: Intl.DateTimeFormatOptions = {
  month: "short",
  day: "numeric",
  year: "numeric"
};

export interface DatePickerProps extends FieldOwnProps, BaseProps {
  id?: string;
  /** The form field name; the form receives the date as YYYY-MM-DD. */
  name?: string;
  /** Controlled value as YYYY-MM-DD ("" for none). The parent owns it; a reset leaves it. */
  value?: string;
  /** Uncontrolled starting value as YYYY-MM-DD; a form reset restores it. */
  defaultValue?: string;
  /** Earliest selectable date as YYYY-MM-DD. */
  min?: string;
  /** Latest selectable date as YYYY-MM-DD. */
  max?: string;
  /** Whether a date (YYYY-MM-DD) can't be picked, besides those outside `min` and `max`. */
  excludeDate?: (value: string) => boolean;
  /** Shown before the date, e.g. "As of" for "As of Oct 5, 2026". */
  prefix?: string;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  /** Shows a clear button while a date is picked. Backspace also clears. */
  clearable?: boolean;
  /** Locale for the shown date, month and weekday names. Default "en-US". */
  locale?: string;
  /** How the picked date is shown. Default { month: "short", day: "numeric", year: "numeric" }. */
  format?: Intl.DateTimeFormatOptions;
  /** 0 is Sunday, 1 is Monday. Default 0. */
  firstDayOfWeek?: number;
  /** Replaces the calendar shown at the end of the field while it has no clear button. */
  calendarIcon?: JSX.Element;
  /** Replaces the cross on the clear button. */
  clearIcon?: JSX.Element;
  /** Replaces the arrow that pages back in the calendar. */
  previousIcon?: JSX.Element;
  /** Replaces the arrow that pages forward in the calendar. */
  nextIcon?: JSX.Element;
  "aria-label"?: string;
  /** Receives the picked date as YYYY-MM-DD, or "" when cleared. */
  onChange?: (value: string) => void;
}

/**
 * A date field picked from a calendar: days, then months and years from its header. Unlike
 * `<input type="date">`, it shows dates in a fixed format instead of the browser's locale, and it
 * submits YYYY-MM-DD through a hidden input. The field can't be typed in.
 */
export function DatePicker(props: DatePickerProps) {
  const [local, field] = splitProps(props, ["class", "style"]);
  const isReadOnly = useReadOnly(() => props.readOnly === true);
  const dialogId = `bx-datepicker-${createUniqueId()}`;
  const date = createControllableSignal<string>({
    value: () => props.value,
    defaultValue: () => props.defaultValue ?? ""
  });
  const value = date.value;
  const [open, setOpen] = createSignal(false);
  const [level, setLevel] = createSignal<Level>("month");
  // The day the arrow keys move and Enter picks while the calendar is open; at the year and
  // decade levels only its month or year matters.
  const [active, setActive] = createSignal(toISODate(new Date()));
  // Read again on each opening, so a page left open past midnight marks the right day.
  const [today, setToday] = createSignal(toISODate(new Date()));
  let inputRef: HTMLInputElement | undefined;
  let fieldRef: HTMLDivElement | undefined;
  let panelRef: HTMLDivElement | undefined;

  onFormReset(() => fieldRef, date.reset);

  const locale = () => props.locale ?? "en-US";
  const formats = createMemo(() => ({
    value: new Intl.DateTimeFormat(locale(), props.format ?? DEFAULT_FORMAT),
    full: new Intl.DateTimeFormat(locale(), { dateStyle: "full" }),
    monthYear: new Intl.DateTimeFormat(locale(), { month: "long", year: "numeric" }),
    shortMonth: new Intl.DateTimeFormat(locale(), { month: "short" }),
    weekday: new Intl.DateTimeFormat(locale(), { weekday: "short" })
  }));
  const format = (iso: string | undefined, formatter = formats().value) => {
    const parsed = parseISODate(iso);
    return parsed ? formatter.format(parsed) : "";
  };

  const firstDayOfWeek = () => (((props.firstDayOfWeek ?? 0) % 7) + 7) % 7;
  // 2023-01-01 was a Sunday, so day n of that week is weekday n.
  const weekdays = createMemo(() => {
    const first = firstDayOfWeek();
    const formatter = formats().weekday;
    return Array.from({ length: 7 }, (_, i) =>
      formatter.format(new Date(2023, 0, 1 + ((first + i) % 7)))
    );
  });

  // What the event handlers read, as memos: a handler has no reactive owner, and reading a prop
  // written as a condition (`min={a() ? b : c}`) there would make Solid create a computation that
  // is never disposed.
  const inactive = createMemo(() => props.disabled === true || isReadOnly());
  const range = createMemo(() => ({
    min: props.min,
    max: props.max,
    excludeDate: props.excludeDate
  }));
  createEffect(() => {
    if (inactive()) setOpen(false);
  });

  const outOfRange = (iso: string) => {
    const { min, max, excludeDate } = range();
    return (!!min && iso < min) || (!!max && iso > max) || !!excludeDate?.(iso);
  };
  /** Whether no day of the month of `iso` can be picked. */
  const monthOutOfRange = (iso: string) =>
    (!!props.min && iso.slice(0, 7) < props.min.slice(0, 7)) ||
    (!!props.max && iso.slice(0, 7) > props.max.slice(0, 7));
  const yearOutOfRange = (year: number) =>
    (!!props.min && year < Number(props.min.slice(0, 4))) ||
    (!!props.max && year > Number(props.max.slice(0, 4)));

  // The visible input stays editable (typing is blocked instead), because read-only inputs skip
  // validation: this way `required` and these messages still stop a form from submitting.
  createEffect(() => {
    const iso = value();
    let message = "";
    if (iso && props.min && iso < props.min) message = `Pick ${format(props.min)} or later.`;
    else if (iso && props.max && iso > props.max) message = `Pick ${format(props.max)} or earlier.`;
    else if (iso && props.excludeDate?.(iso)) message = "This date can't be picked.";
    inputRef?.setCustomValidity(message);
  });

  const commit = (iso: string) => {
    if (iso === value()) return;
    date.setValue(iso);
    props.onChange?.(iso);
  };

  const openCalendar = () => {
    if (inactive() || open()) return;
    setToday(toISODate(new Date()));
    // A value that isn't a real date (e.g. "2026-02-30") opens on today instead.
    setActive(parseISODate(value()) ? value() : today());
    setLevel("month");
    setOpen(true);
  };

  const pick = (iso: string) => {
    if (outOfRange(iso)) return;
    commit(iso);
    setOpen(false);
  };

  /** Shows the days of the month of `iso`, or the months of its year. */
  const drillDown = (iso: string) => {
    setActive(iso);
    setLevel(level() === "decade" ? "year" : "month");
  };

  const moveActive = (steps: number) => {
    const unit = level();
    setActive(
      unit === "month"
        ? addDays(active(), steps)
        : addMonths(active(), unit === "year" ? steps : steps * 12)
    );
  };

  /** Moves the calendar a page: a month, a year or a decade. */
  const page = (direction: -1 | 1) => {
    const months = { month: 1, year: 12, decade: 120 }[level()];
    setActive(addMonths(active(), direction * months));
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (inactive()) return;
    if (event.key === "Backspace" || event.key === "Delete") {
      event.preventDefault();
      // The same rule as the clear button, as Select does: only a clearable field clears.
      if (canClear()) commit("");
      return;
    }
    if (!open()) {
      if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openCalendar();
      }
      return;
    }
    const moves = LEVEL_MOVES[level()];
    if (event.key in moves) {
      event.preventDefault();
      moveActive(moves[event.key]!);
    } else if (event.key === "PageUp" || event.key === "PageDown") {
      event.preventDefault();
      page(event.key === "PageUp" ? -1 : 1);
    } else if (event.key === "Escape") {
      event.preventDefault();
      if (level() === "month") setOpen(false);
      else setLevel("month");
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (level() === "month") pick(active());
      else drillDown(active());
    } else if (event.key === "Tab") {
      setOpen(false);
    }
  };

  const closeOnOutsideClick = (event: MouseEvent) => {
    const target = event.target as Node;
    if (fieldRef?.contains(target) || panelRef?.contains(target)) return;
    setOpen(false);
  };

  createEffect(() => {
    if (!open()) return;
    document.addEventListener("mousedown", closeOnOutsideClick);
    onCleanup(() => document.removeEventListener("mousedown", closeOnOutsideClick));
  });

  // Typing, pasting and dropping text are all blocked; the date only comes from the calendar.
  const blockEditing = (event: Event) => event.preventDefault();
  const setInputRef = (element: HTMLInputElement) => {
    inputRef = element;
    for (const type of ["beforeinput", "paste", "drop", "cut"]) {
      element.addEventListener(type, blockEditing);
    }
  };

  const days = createMemo(() => calendarDays(active(), firstDayOfWeek()));
  const months = createMemo(() => yearMonths(active()));
  const years = createMemo(() => decadeYears(active()));
  const activeMonth = () => active().slice(0, 7);
  const activeYear = () => Number(active().slice(0, 4));

  const headerLabel = () => {
    if (level() === "month") return format(active(), formats().monthYear);
    if (level() === "year") return active().slice(0, 4);
    const decade = years();
    return `${decade[0]} – ${decade[decade.length - 1]}`;
  };
  /**
   * The highlighted date, read out as the arrow keys move it: focus stays in the field, so a
   * screen reader would otherwise not hear it.
   */
  const activeAnnouncement = () => {
    if (!open()) return "";
    const iso = active();
    if (level() === "decade") return iso.slice(0, 4);
    if (level() === "year") return format(iso, formats().monthYear);
    const notes = [iso === value() && "selected", outOfRange(iso) && "unavailable"].filter(Boolean);
    return [format(iso, formats().full), ...notes].join(", ");
  };
  const pageLabel = (direction: "Previous" | "Next") =>
    `${direction} ${{ month: "month", year: "year", decade: "decade" }[level()]}`;

  const displayValue = () => {
    const text = format(value());
    return props.prefix && text ? `${props.prefix} ${text}` : text;
  };
  const canClear = createMemo(() => props.clearable === true && !!value() && !inactive());

  return (
    <div
      ref={element => (fieldRef = element)}
      class={cx("bx-DatePicker", local.class)}
      style={local.style}
      data-inactive={inactive() ? "" : undefined}
      onClick={event => {
        // A click on the label is followed by the click it forwards to the input; toggling on
        // both would open the calendar and close it again.
        if ((event.target as Element).closest("label")) return;
        if (open()) setOpen(false);
        else openCalendar();
      }}
    >
      <Input
        id={field.id}
        label={field.label}
        description={field.description}
        error={field.error}
        aria-label={field["aria-label"]}
        value={displayValue()}
        placeholder={field.placeholder ?? "Pick a date"}
        required={field.required}
        disabled={field.disabled}
        readOnly={field.readOnly}
        inputMode="none"
        autocomplete="off"
        // A combobox that pops up a dialog: the ARIA pattern for a date field with a calendar.
        role="combobox"
        aria-haspopup="dialog"
        aria-expanded={open()}
        aria-controls={open() ? dialogId : undefined}
        inputClass="bx-DatePicker-input"
        ref={setInputRef}
        onKeyDown={handleKeyDown}
        rightSection={
          canClear() ? (
            {
              pointerEvents: "all",
              node: (
                <button
                  type="button"
                  class="bx-Input-sectionButton"
                  aria-label="Clear date"
                  tabindex={-1}
                  onClick={event => {
                    event.stopPropagation();
                    commit("");
                  }}
                >
                  {props.clearIcon ?? <CloseIcon />}
                </button>
              )
            }
          ) : (
            <span class="bx-DatePicker-icon">{props.calendarIcon ?? <CalendarIcon />}</span>
          )
        }
      />
      <input type="hidden" name={field.name} value={value()} disabled={field.disabled} />
      <span class="bx-visually-hidden" aria-live="polite" aria-atomic="true">
        {activeAnnouncement()}
      </span>
      <FloatingPanel
        open={open()}
        target={() => inputRef?.parentElement ?? undefined}
        position="bottom"
        ref={element => (panelRef = element)}
        class="bx-Dropdown bx-DatePicker-panel"
        onClick={event => event.stopPropagation()}
      >
        {/* Keeps focus in the input, so the keyboard keeps driving the calendar. */}
        <div
          id={dialogId}
          role="dialog"
          aria-label="Choose a date"
          onMouseDown={event => event.preventDefault()}
        >
          <div class="bx-DatePicker-header">
            <button
              type="button"
              class="bx-DatePicker-control"
              aria-label={pageLabel("Previous")}
              onClick={() => page(-1)}
            >
              {props.previousIcon ?? <ChevronLeftIcon />}
            </button>
            <button
              type="button"
              class="bx-DatePicker-control bx-DatePicker-level"
              aria-live="polite"
              disabled={level() === "decade"}
              onClick={() => setLevel(level() === "month" ? "year" : "decade")}
            >
              {headerLabel()}
            </button>
            <button
              type="button"
              class="bx-DatePicker-control"
              aria-label={pageLabel("Next")}
              onClick={() => page(1)}
            >
              {props.nextIcon ?? <ChevronRightIcon />}
            </button>
          </div>
          <Switch>
            <Match when={level() === "month"}>
              <div class="bx-DatePicker-days" role="group" aria-label="Days">
                <For each={weekdays()}>
                  {weekday => (
                    <span class="bx-DatePicker-weekday" aria-hidden="true">
                      {weekday}
                    </span>
                  )}
                </For>
                <For each={days()}>
                  {day => (
                    <button
                      type="button"
                      class="bx-DatePicker-cell"
                      tabindex={-1}
                      aria-label={format(day, formats().full)}
                      aria-pressed={day === value()}
                      data-active={day === active() ? "" : undefined}
                      data-outside={day.slice(0, 7) !== activeMonth() ? "" : undefined}
                      data-today={day === today() ? "" : undefined}
                      disabled={outOfRange(day)}
                      onClick={() => pick(day)}
                    >
                      {Number(day.slice(8))}
                    </button>
                  )}
                </For>
              </div>
            </Match>
            <Match when={level() === "year"}>
              <div class="bx-DatePicker-picks" role="group" aria-label="Months">
                <For each={months()}>
                  {month => (
                    <button
                      type="button"
                      class="bx-DatePicker-cell"
                      tabindex={-1}
                      aria-label={format(month, formats().monthYear)}
                      aria-pressed={month.slice(0, 7) === value().slice(0, 7)}
                      data-active={month.slice(0, 7) === activeMonth() ? "" : undefined}
                      disabled={monthOutOfRange(month)}
                      onClick={() => drillDown(month)}
                    >
                      {format(month, formats().shortMonth)}
                    </button>
                  )}
                </For>
              </div>
            </Match>
            <Match when={level() === "decade"}>
              <div class="bx-DatePicker-picks" role="group" aria-label="Years">
                <For each={years()}>
                  {year => (
                    <button
                      type="button"
                      class="bx-DatePicker-cell"
                      tabindex={-1}
                      aria-pressed={String(year) === value().slice(0, 4)}
                      data-active={year === activeYear() ? "" : undefined}
                      disabled={yearOutOfRange(year)}
                      onClick={() => drillDown(`${year}${active().slice(4, 7)}-01`)}
                    >
                      {year}
                    </button>
                  )}
                </For>
              </div>
            </Match>
          </Switch>
        </div>
      </FloatingPanel>
    </div>
  );
}
