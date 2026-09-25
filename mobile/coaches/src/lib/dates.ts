export function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * The calendar range for one month.
 *
 * `month` is 0-based, matching `Date`. Values outside 0-11 roll into the
 * neighbouring year, so stepping from December to January needs no special
 * casing at the call site.
 */
export function monthRange(
  year: number,
  month: number,
): {
  from: string;
  to: string;
  daysInMonth: number;
  label: string;
  /** Month and year together, for a navigation header: "August 2026". */
  monthYearLabel: string;
  /** Weekday the 1st falls on, 0 = Sunday, so a grid can be offset correctly. */
  firstWeekday: number;
} {
  const first = new Date(year, month, 1);
  // Day 0 of the following month is the last day of this one.
  const last = new Date(year, month + 1, 0);
  return {
    from: formatDateKey(first),
    to: formatDateKey(last),
    daysInMonth: last.getDate(),
    label: first.toLocaleString('en-US', { month: 'long' }),
    monthYearLabel: first.toLocaleString('en-US', { month: 'long', year: 'numeric' }),
    firstWeekday: first.getDay(),
  };
}

export function currentMonthRange(): ReturnType<typeof monthRange> {
  const now = new Date();
  return monthRange(now.getFullYear(), now.getMonth());
}

export function lastNDaysRange(n: number): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to);
  from.setDate(to.getDate() - (n - 1));
  return { from: formatDateKey(from), to: formatDateKey(to) };
}

/**
 * The last `months` calendar months up to and including today: on 15 Sep, one
 * month is 16 Aug – 15 Sep. A day the earlier month doesn't have (31 Mar back
 * to February) clamps to its last day first.
 */
export function lastMonthsRange(months: number): { from: string; to: string } {
  const to = new Date();
  const lastDayThen = new Date(to.getFullYear(), to.getMonth() - months + 1, 0).getDate();
  const from = new Date(to.getFullYear(), to.getMonth() - months, Math.min(to.getDate(), lastDayThen) + 1);
  return { from: formatDateKey(from), to: formatDateKey(to) };
}

/**
 * A YYYY-MM-DD key as local midnight on that calendar date. The API's dates
 * are calendar dates, never instants: `new Date("2026-09-15")` would read one
 * as UTC midnight, which is the 14th anywhere west of Greenwich.
 */
export function parseDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.slice(0, 10).split('-').map(Number);
  return new Date(year ?? 0, (month ?? 1) - 1, day ?? 1);
}

export function addDays(dateKey: string, days: number): string {
  const date = parseDateKey(dateKey);
  date.setDate(date.getDate() + days);
  return formatDateKey(date);
}

/**
 * The same day `months` later, clamped to the end of a shorter month:
 * 30 Nov + 3 months is 28 Feb, not 2 Mar.
 */
export function addMonths(dateKey: string, months: number): string {
  const date = parseDateKey(dateKey);
  const target = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(date.getDate(), lastDay));
  return formatDateKey(target);
}

/** A real calendar date written YYYY-MM-DD: "2026-02-30" is not one. */
export function isDateKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return formatDateKey(parseDateKey(value)) === value;
}

/** Whole calendar days from `from` to `to`. Counts dates rather than hours, so a DST change can't skew it. */
export function daysBetween(from: string, to: string): number {
  const a = parseDateKey(from);
  const b = parseDateKey(to);
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  return Math.round(
    (Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) - Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) /
      MS_PER_DAY,
  );
}

/** Returns the 1-based day-of-month from a YYYY-MM-DD string. */
export function dayOfMonth(dateKey: string): number {
  return Number(dateKey.slice(8, 10));
}

export function weekdayLabel(dateKey: string): string {
  const date = new Date(`${dateKey}T00:00:00`);
  return date.toLocaleString('en-US', { weekday: 'short' });
}

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Compact day label for captions, e.g. "14 Sep". Parses a YYYY-MM-DD key as a
 * local date, so it never shifts a day across a timezone boundary.
 */
export function shortDateLabel(dateKey: string): string {
  const date = parseDateKey(dateKey);
  if (Number.isNaN(date.getTime())) return dateKey;
  // Built by hand: Intl's short month varies by engine and locale ("Sep" vs "Sept").
  return `${date.getDate()} ${SHORT_MONTHS[date.getMonth()]}`;
}

/** "Sep" for a YYYY-MM-DD key. */
export function shortMonthLabel(dateKey: string): string {
  return SHORT_MONTHS[parseDateKey(dateKey).getMonth()] ?? '';
}

/** Human-readable date for display, e.g. "5 Sep 2026". */
export function longDateLabel(value: string): string {
  // A bare calendar date is read as local; a full timestamp is a real instant.
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? parseDateKey(value) : new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}
