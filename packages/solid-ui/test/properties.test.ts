// Property-based tests: fast-check generates many inputs for each rule and shrinks any failure to
// the smallest input that breaks it. They cover the pure helpers behind InputNumber, DatePicker
// and Avatar, whose edge cases (float noise, year 0, leap days, emoji) are easy to miss by hand.
// The same file runs in react-ui and solid-ui, which share these helpers.
import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { getInitials } from "../src/components/Avatar/Avatar";
import {
  addDays,
  addMonths,
  calendarDays,
  parseISODate,
  toISODate
} from "../src/components/DatePicker/dates";
import { formatNumber, parseNumber, roundNumber } from "../src/components/InputNumber/InputNumber";

const isLeapYear = (year: number) => year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
const daysInMonth = (year: number, month: number) =>
  [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1]!;
const pad = (value: number, length: number) => String(value).padStart(length, "0");
const iso = (year: number, month: number, day: number) =>
  `${pad(year, 4)}-${pad(month, 2)}-${pad(day, 2)}`;

/** A valid date as YYYY-MM-DD, between the given years. */
const isoDate = (minYear = 0, maxYear = 9999) =>
  fc
    .record({
      year: fc.integer({ min: minYear, max: maxYear }),
      month: fc.integer({ min: 1, max: 12 }),
      day: fc.integer({ min: 1, max: 31 })
    })
    .map(({ year, month, day }) => ({
      year,
      month,
      day: Math.min(day, daysInMonth(year, month))
    }));

/** Numbers an InputNumber holds: within 15 significant digits once rounded. */
const amount = fc.double({ min: -1e9, max: 1e9, noNaN: true, noDefaultInfinity: true });
const decimals = fc.integer({ min: 0, max: 5 });

describe("number helpers (properties)", () => {
  it("roundNumber keeps at most the given decimals and moves the value by at most half a step", () => {
    fc.assert(
      fc.property(amount, decimals, (value, places) => {
        const rounded = roundNumber(value, places);
        expect(Number(rounded.toFixed(places))).toBe(rounded);
        expect(Math.abs(rounded - value)).toBeLessThanOrEqual(0.5 / 10 ** places + 1e-6);
      })
    );
  });

  it("roundNumber rounds negatives as the mirror of positives (half away from zero)", () => {
    fc.assert(
      fc.property(amount, decimals, (value, places) => {
        // + 0 turns -0 into 0, so only the magnitude is compared.
        expect(roundNumber(-value, places) + 0).toBe(-roundNumber(value, places) + 0);
      })
    );
  });

  it("formatNumber shows a minus only for what stays negative once rounded (no -0.00)", () => {
    fc.assert(
      fc.property(amount, decimals, (value, places) => {
        expect(formatNumber(value, places).startsWith("-")).toBe(roundNumber(value, places) < 0);
      })
    );
  });

  it("parseNumber reads back what formatNumber writes", () => {
    fc.assert(
      fc.property(amount, decimals, (value, places) => {
        const rounded = roundNumber(value, places);
        expect(parseNumber(formatNumber(rounded, places))).toBe(rounded + 0);
      })
    );
  });

  it("parseNumber reads commas only as thousands separators, never as a decimal comma", () => {
    const groups = fc.array(fc.integer({ min: 0, max: 999 }), { minLength: 1, maxLength: 3 });
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 999 }), groups, (lead, rest) => {
        const text = [String(lead), ...rest.map(group => pad(group, 3))].join(",");
        expect(parseNumber(text)).toBe(Number(text.replaceAll(",", "")));
      })
    );
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 999 }),
        fc.stringMatching(/^\d{1,2}$|^\d{4,}$/),
        (whole, fraction) => {
          expect(parseNumber(`${whole},${fraction}`)).toBeNull();
        }
      )
    );
  });
});

describe("date helpers (properties)", () => {
  it("round-trips every valid date from year 0 to 9999", () => {
    fc.assert(
      fc.property(isoDate(), ({ year, month, day }) => {
        const text = iso(year, month, day);
        const date = parseISODate(text);
        expect(date?.getFullYear()).toBe(year);
        expect(toISODate(date!)).toBe(text);
      })
    );
  });

  it("rejects days past the end of the month", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 9999 }),
        fc.integer({ min: 1, max: 12 }),
        fc.integer({ min: 1, max: 3 }),
        (year, month, extra) => {
          const day = daysInMonth(year, month) + extra;
          fc.pre(day <= 99);
          expect(parseISODate(iso(year, month, day))).toBeUndefined();
        }
      )
    );
  });

  it("addMonths lands in the target month, on the same day or its last day", () => {
    fc.assert(
      fc.property(
        isoDate(100, 9899),
        fc.integer({ min: -1200, max: 1200 }),
        ({ year, month, day }, months) => {
          const index = year * 12 + (month - 1) + months;
          const targetYear = Math.floor(index / 12);
          const targetMonth = (index % 12) + 1;
          const expectedDay = Math.min(day, daysInMonth(targetYear, targetMonth));
          expect(addMonths(iso(year, month, day), months)).toBe(
            iso(targetYear, targetMonth, expectedDay)
          );
        }
      )
    );
  });

  it("addDays forward and back returns the same date", () => {
    fc.assert(
      fc.property(
        isoDate(20, 9979),
        fc.integer({ min: -3650, max: 3650 }),
        ({ year, month, day }, days) => {
          const start = iso(year, month, day);
          expect(addDays(addDays(start, days), -days)).toBe(start);
        }
      )
    );
  });

  it("calendarDays shows 6 full weeks around the month, starting on the given weekday", () => {
    fc.assert(
      fc.property(
        isoDate(1, 9998),
        fc.integer({ min: 0, max: 6 }),
        ({ year, month, day }, firstDayOfWeek) => {
          const days = calendarDays(iso(year, month, day), firstDayOfWeek);
          expect(days).toHaveLength(42);
          expect(days).toContain(iso(year, month, 1));
          expect(days).toContain(iso(year, month, daysInMonth(year, month)));
          expect(parseISODate(days[0])!.getDay()).toBe(firstDayOfWeek);
          for (let i = 1; i < days.length; i++) expect(days[i]).toBe(addDays(days[i - 1]!, 1));
        }
      )
    );
  });
});

describe("getInitials (properties)", () => {
  // Whole characters as a reader sees them, from plain letters to emoji, flags and accents.
  const word = fc
    .string({ unit: "grapheme", minLength: 1, maxLength: 6 })
    .filter(text => text.trim() === text && !/\s/.test(text));

  it("never splits a character: the result is well formed and starts the name", () => {
    fc.assert(
      fc.property(word, text => {
        const one = getInitials(text, false);
        const two = getInitials(text);
        expect(one.isWellFormed()).toBe(true);
        expect(two.isWellFormed()).toBe(true);
        expect(one.length).toBeGreaterThan(0);
        expect(text.startsWith(one)).toBe(true);
        expect(text.startsWith(two)).toBe(true);
      })
    );
  });

  it("takes the first character of each of the first two words", () => {
    fc.assert(
      fc.property(word, word, (first, second) => {
        expect(getInitials(`${first} ${second}`)).toBe(
          getInitials(first, false) + getInitials(second, false)
        );
      })
    );
  });
});
