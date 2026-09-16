/**
 * Calendar dates, never instants. A plan's day, a check-in and a weigh-in all
 * happen on a date, not at a moment: they are stored in `@db.Date` columns and
 * handled here as YYYY-MM-DD, with UTC midnight standing in when a Date object
 * is unavoidable. Doing the arithmetic in local time is what shifts a day
 * either side of midnight for anyone not on UTC.
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type DateKey = string;

/** "2026-09-16" as the UTC-midnight Date a `@db.Date` column stores. */
export function parseDateKey(value: DateKey): Date {
  return new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
}

/** The calendar date of a Date, by its UTC parts. */
export function dateKeyOf(value: Date): DateKey {
  return value.toISOString().slice(0, 10);
}

/** Whole days from `from` to `to`; negative when `to` is earlier. */
export function daysBetween(from: DateKey, to: DateKey): number {
  return Math.round((parseDateKey(to).getTime() - parseDateKey(from).getTime()) / MS_PER_DAY);
}

export function addDays(value: DateKey, days: number): DateKey {
  return dateKeyOf(new Date(parseDateKey(value).getTime() + days * MS_PER_DAY));
}

/** Every date from `from` to `to` inclusive. Empty when the range runs backwards. */
export function eachDate(from: DateKey, to: DateKey): DateKey[] {
  const span = daysBetween(from, to);
  if (span < 0) return [];
  return Array.from({ length: span + 1 }, (_, offset) => addDays(from, offset));
}
