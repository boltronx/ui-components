// Dates are YYYY-MM-DD strings throughout: what a form submits and what <input type="date"> uses.
// They compare correctly as strings and carry no time zone, so a day never shifts by one.

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** A date as YYYY-MM-DD in local time; `toISOString()` would convert it to UTC first. */
export function toISODate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** A YYYY-MM-DD string as a local date; `new Date(iso)` would read it as UTC midnight. */
export function parseISODate(value: string | undefined): Date | undefined {
  const match = ISO_DATE.exec(value ?? "");
  if (!match) return undefined;
  const [year, month, day] = match.slice(1).map(Number) as [number, number, number];
  const date = new Date(year, month - 1, day);
  return date.getMonth() === month - 1 ? date : undefined;
}

export function addDays(iso: string, days: number): string {
  const date = parseISODate(iso)!;
  return toISODate(new Date(date.getFullYear(), date.getMonth(), date.getDate() + days));
}

/** The same day in another month, kept within that month (Jan 31 + 1 month is Feb 28). */
export function addMonths(iso: string, months: number): string {
  const date = parseISODate(iso)!;
  const lastDay = new Date(date.getFullYear(), date.getMonth() + months + 1, 0).getDate();
  return toISODate(
    new Date(date.getFullYear(), date.getMonth() + months, Math.min(date.getDate(), lastDay))
  );
}

/** The six weeks shown for the month of `iso`, starting on `firstDayOfWeek` (0 is Sunday). */
export function calendarDays(iso: string, firstDayOfWeek = 0): string[] {
  const date = parseISODate(iso)!;
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const offset = (first.getDay() - firstDayOfWeek + 7) % 7;
  return Array.from({ length: 42 }, (_, i) =>
    toISODate(new Date(first.getFullYear(), first.getMonth(), 1 - offset + i))
  );
}

/** The first day of each month in the year of `iso`. */
export function yearMonths(iso: string): string[] {
  const year = iso.slice(0, 4);
  return Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}-01`);
}

/** The ten years of the decade of `iso`. */
export function decadeYears(iso: string): number[] {
  const start = Math.floor(Number(iso.slice(0, 4)) / 10) * 10;
  return Array.from({ length: 10 }, (_, i) => start + i);
}
