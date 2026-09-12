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

/** Returns the 1-based day-of-month from a YYYY-MM-DD string. */
export function dayOfMonth(dateKey: string): number {
  return Number(dateKey.slice(8, 10));
}

export function weekdayLabel(dateKey: string): string {
  const date = new Date(`${dateKey}T00:00:00`);
  return date.toLocaleString('en-US', { weekday: 'short' });
}

/** Human-readable date for display, e.g. "5 Sep 2026". */
export function longDateLabel(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}
