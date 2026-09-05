export function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function currentMonthRange(): {
  from: string;
  to: string;
  daysInMonth: number;
  label: string;
} {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    from: formatDateKey(first),
    to: formatDateKey(last),
    daysInMonth: last.getDate(),
    label: first.toLocaleString('en-US', { month: 'long' }),
  };
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
