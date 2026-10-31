"use client";

import {
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState
} from "react";

import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon, CloseIcon } from "../../icons";
import { useControllableState, useFormReset } from "../../utils/form";
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
  calendarIcon?: ReactNode;
  /** Replaces the cross on the clear button. */
  clearIcon?: ReactNode;
  /** Replaces the arrow that pages back in the calendar. */
  previousIcon?: ReactNode;
  /** Replaces the arrow that pages forward in the calendar. */
  nextIcon?: ReactNode;
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
  const isReadOnly = useReadOnly(props.readOnly);
  const dialogId = `bx-datepicker-${useId()}`;
  const date = useControllableState<string>({
    value: props.value,
    defaultValue: props.defaultValue ?? ""
  });
  const value = date.value;
  const [open, setOpen] = useState(false);
  const [level, setLevel] = useState<Level>("month");
  // The day the arrow keys move and Enter picks while the calendar is open; at the year and
  // decade levels only its month or year matters. Set on open, so the server never renders it.
  const [active, setActive] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  // The calendar lines up with the field's box, not the bare input.
  const target = useMemo<RefObject<HTMLElement | null>>(
    () => ({
      get current() {
        return inputRef.current?.parentElement ?? null;
      }
    }),
    []
  );

  useFormReset(fieldRef, date.reset);

  const locale = props.locale ?? "en-US";
  // Keyed by content, so an inline `format={{ ... }}` doesn't rebuild the formatters every render.
  const formatKey = JSON.stringify(props.format ?? DEFAULT_FORMAT);
  const formats = useMemo(
    () => ({
      value: new Intl.DateTimeFormat(locale, JSON.parse(formatKey) as Intl.DateTimeFormatOptions),
      full: new Intl.DateTimeFormat(locale, { dateStyle: "full" }),
      monthYear: new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }),
      shortMonth: new Intl.DateTimeFormat(locale, { month: "short" }),
      weekday: new Intl.DateTimeFormat(locale, { weekday: "short" })
    }),
    [locale, formatKey]
  );
  const format = (iso: string | undefined, formatter = formats.value) => {
    const parsed = parseISODate(iso);
    return parsed ? formatter.format(parsed) : "";
  };

  const firstDayOfWeek = (((props.firstDayOfWeek ?? 0) % 7) + 7) % 7;
  // 2023-01-01 was a Sunday, so day n of that week is weekday n.
  const weekdays = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) =>
        formats.weekday.format(new Date(2023, 0, 1 + ((firstDayOfWeek + i) % 7)))
      ),
    [formats, firstDayOfWeek]
  );

  const inactive = props.disabled || isReadOnly;
  useEffect(() => {
    if (inactive) setOpen(false);
  }, [inactive]);

  const outOfRange = (iso: string) =>
    (!!props.min && iso < props.min) ||
    (!!props.max && iso > props.max) ||
    !!props.excludeDate?.(iso);
  /** Whether no day of the month of `iso` can be picked. */
  const monthOutOfRange = (iso: string) =>
    (!!props.min && iso.slice(0, 7) < props.min.slice(0, 7)) ||
    (!!props.max && iso.slice(0, 7) > props.max.slice(0, 7));
  const yearOutOfRange = (year: number) =>
    (!!props.min && year < Number(props.min.slice(0, 4))) ||
    (!!props.max && year > Number(props.max.slice(0, 4)));

  // The visible input stays editable (typing is blocked instead), because read-only inputs skip
  // validation: this way `required` and these messages still stop a form from submitting.
  let validity = "";
  if (value && props.min && value < props.min) validity = `Pick ${format(props.min)} or later.`;
  else if (value && props.max && value > props.max)
    validity = `Pick ${format(props.max)} or earlier.`;
  else if (value && props.excludeDate?.(value)) validity = "This date can't be picked.";
  useEffect(() => {
    inputRef.current?.setCustomValidity(validity);
  }, [validity]);

  // Typing, pasting and dropping text are all blocked; the date only comes from the calendar.
  useEffect(() => {
    const element = inputRef.current;
    if (!element) return;
    const blockEditing = (event: Event) => event.preventDefault();
    const types = ["beforeinput", "paste", "drop", "cut"];
    for (const type of types) element.addEventListener(type, blockEditing);
    return () => {
      for (const type of types) element.removeEventListener(type, blockEditing);
    };
  }, []);

  const commit = (iso: string) => {
    if (iso === value) return;
    date.setValue(iso);
    props.onChange?.(iso);
  };

  const openCalendar = () => {
    if (inactive || open) return;
    // A value that isn't a YYYY-MM-DD date (e.g. an API's "2024-02-05T00:00:00Z") opens on today.
    setActive(parseISODate(value) ? value : toISODate(new Date()));
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
    setLevel(level === "decade" ? "year" : "month");
  };

  const moveActive = (steps: number) => {
    setActive(
      level === "month"
        ? addDays(active, steps)
        : addMonths(active, level === "year" ? steps : steps * 12)
    );
  };

  /**
   * Moves the calendar a page: a month, a year or a decade. A long page (Shift+PageUp/PageDown)
   * moves the next unit up, so the keyboard reaches far dates without the header's level button.
   */
  const page = (direction: -1 | 1, long = false) => {
    const months = { month: 1, year: 12, decade: 120 }[level];
    const factor = long ? (level === "month" ? 12 : 10) : 1;
    setActive(addMonths(active, direction * months * factor));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (inactive) return;
    if (event.key === "Backspace" || event.key === "Delete") {
      event.preventDefault();
      // The same rule as the clear button, as Select does: only a clearable field clears.
      if (canClear) commit("");
      return;
    }
    if (!open) {
      if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openCalendar();
      }
      return;
    }
    const moves = LEVEL_MOVES[level];
    if (event.key in moves) {
      event.preventDefault();
      moveActive(moves[event.key]!);
    } else if (event.key === "PageUp" || event.key === "PageDown") {
      event.preventDefault();
      page(event.key === "PageUp" ? -1 : 1, event.shiftKey);
    } else if (event.key === "Escape") {
      event.preventDefault();
      if (level === "month") setOpen(false);
      else setLevel("month");
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (level === "month") pick(active);
      else drillDown(active);
    } else if (event.key === "Tab") {
      setOpen(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: globalThis.MouseEvent) => {
      const target = event.target as Node;
      if (fieldRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [open]);

  const days = useMemo(
    () => (active ? calendarDays(active, firstDayOfWeek) : []),
    [active, firstDayOfWeek]
  );
  const months = useMemo(() => (active ? yearMonths(active) : []), [active]);
  const years = useMemo(() => (active ? decadeYears(active) : []), [active]);
  const activeMonth = active.slice(0, 7);
  const activeYear = Number(active.slice(0, 4));
  const today = open ? toISODate(new Date()) : "";

  const headerLabel =
    level === "month"
      ? format(active, formats.monthYear)
      : level === "year"
        ? active.slice(0, 4)
        : `${years[0]} – ${years[years.length - 1]}`;
  /**
   * The highlighted date, read out as the arrow keys move it: focus stays in the field, so a
   * screen reader would otherwise not hear it.
   */
  const activeAnnouncement = (() => {
    if (!open) return "";
    if (level === "decade") return active.slice(0, 4);
    if (level === "year") return format(active, formats.monthYear);
    const notes = [active === value && "selected", outOfRange(active) && "unavailable"].filter(
      Boolean
    );
    return [format(active, formats.full), ...notes].join(", ");
  })();
  const pageLabel = (direction: "Previous" | "Next") =>
    `${direction} ${{ month: "month", year: "year", decade: "decade" }[level]}`;

  const text = format(value);
  const displayValue = props.prefix && text ? `${props.prefix} ${text}` : text;
  const canClear = props.clearable === true && !!value && !inactive;

  return (
    <div
      ref={fieldRef}
      className={cx("bx-DatePicker", props.className)}
      style={props.style}
      data-inactive={inactive ? "" : undefined}
      onClick={event => {
        // A click on the label is followed by the click it forwards to the input; toggling on
        // both would open the calendar and close it again.
        if ((event.target as Element).closest("label")) return;
        if (open) setOpen(false);
        else openCalendar();
      }}
    >
      <Input
        id={props.id}
        label={props.label}
        description={props.description}
        error={props.error}
        aria-label={props["aria-label"]}
        value={displayValue}
        // Typing is blocked, so the value only changes through the calendar.
        onChange={() => {}}
        placeholder={props.placeholder ?? "Pick a date"}
        required={props.required}
        disabled={props.disabled}
        readOnly={props.readOnly}
        inputMode="none"
        autoComplete="off"
        // A combobox that pops up a dialog: the ARIA pattern for a date field with a calendar.
        role="combobox"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? dialogId : undefined}
        inputClassName="bx-DatePicker-input"
        ref={inputRef}
        onKeyDown={handleKeyDown}
        rightSection={
          canClear ? (
            {
              pointerEvents: "all",
              node: (
                <button
                  type="button"
                  className="bx-Input-sectionButton"
                  aria-label="Clear date"
                  tabIndex={-1}
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
            <span className="bx-DatePicker-icon">{props.calendarIcon ?? <CalendarIcon />}</span>
          )
        }
      />
      <input type="hidden" name={props.name} value={value} disabled={props.disabled} />
      <span className="bx-visually-hidden" aria-live="polite" aria-atomic="true">
        {activeAnnouncement}
      </span>
      <FloatingPanel
        open={open}
        target={target}
        position="bottom"
        ref={element => (panelRef.current = element)}
        className="bx-Dropdown bx-DatePicker-panel"
        onClick={event => event.stopPropagation()}
      >
        {/* Keeps focus in the input, so the keyboard keeps driving the calendar. */}
        <div
          id={dialogId}
          role="dialog"
          aria-label="Choose a date"
          onMouseDown={event => event.preventDefault()}
        >
          <div className="bx-DatePicker-header">
            <button
              type="button"
              className="bx-DatePicker-control"
              aria-label={pageLabel("Previous")}
              onClick={() => page(-1)}
            >
              {props.previousIcon ?? <ChevronLeftIcon />}
            </button>
            <button
              type="button"
              className="bx-DatePicker-control bx-DatePicker-level"
              aria-live="polite"
              disabled={level === "decade"}
              onClick={() => setLevel(level === "month" ? "year" : "decade")}
            >
              {headerLabel}
            </button>
            <button
              type="button"
              className="bx-DatePicker-control"
              aria-label={pageLabel("Next")}
              onClick={() => page(1)}
            >
              {props.nextIcon ?? <ChevronRightIcon />}
            </button>
          </div>
          {level === "month" && (
            <div className="bx-DatePicker-days" role="group" aria-label="Days">
              {weekdays.map((weekday, index) => (
                <span key={index} className="bx-DatePicker-weekday" aria-hidden="true">
                  {weekday}
                </span>
              ))}
              {days.map(day => (
                <button
                  key={day}
                  type="button"
                  className="bx-DatePicker-cell"
                  tabIndex={-1}
                  aria-label={format(day, formats.full)}
                  aria-pressed={day === value}
                  data-active={day === active ? "" : undefined}
                  data-outside={day.slice(0, 7) !== activeMonth ? "" : undefined}
                  data-today={day === today ? "" : undefined}
                  disabled={outOfRange(day)}
                  onClick={() => pick(day)}
                >
                  {Number(day.slice(8))}
                </button>
              ))}
            </div>
          )}
          {level === "year" && (
            <div className="bx-DatePicker-picks" role="group" aria-label="Months">
              {months.map(month => (
                <button
                  key={month}
                  type="button"
                  className="bx-DatePicker-cell"
                  tabIndex={-1}
                  aria-label={format(month, formats.monthYear)}
                  aria-pressed={month.slice(0, 7) === value.slice(0, 7)}
                  data-active={month.slice(0, 7) === activeMonth ? "" : undefined}
                  disabled={monthOutOfRange(month)}
                  onClick={() => drillDown(month)}
                >
                  {format(month, formats.shortMonth)}
                </button>
              ))}
            </div>
          )}
          {level === "decade" && (
            <div className="bx-DatePicker-picks" role="group" aria-label="Years">
              {years.map(year => (
                <button
                  key={year}
                  type="button"
                  className="bx-DatePicker-cell"
                  tabIndex={-1}
                  aria-pressed={String(year) === value.slice(0, 4)}
                  data-active={year === activeYear ? "" : undefined}
                  disabled={yearOutOfRange(year)}
                  onClick={() => drillDown(`${year}${active.slice(4, 7)}-01`)}
                >
                  {year}
                </button>
              ))}
            </div>
          )}
        </div>
      </FloatingPanel>
    </div>
  );
}
