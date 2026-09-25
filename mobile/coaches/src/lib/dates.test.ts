import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { daysBetween, formatDateKey, lastMonthsRange, lastNDaysRange, monthRange } from '@/lib/dates';

beforeAll(() => {
  // vitest.config.ts pins Asia/Kolkata; everything below assumes UTC+5:30.
  expect(new Date('2026-09-15T12:00:00Z').getTimezoneOffset()).toBe(-330);
});

afterEach(() => {
  vi.useRealTimers();
});

// This app's dates.ts has no todayKey (the client app's does); formatDateKey is
// the same function, so the same instants are checked through it.
describe('formatDateKey', () => {
  it('uses the local date late in the evening', () => {
    // 23:45 IST on the 15th.
    expect(formatDateKey(new Date('2026-09-15T18:15:00Z'))).toBe('2026-09-15');
  });

  it('uses the local date just after midnight, when UTC is still on the previous day', () => {
    // 00:30 IST on the 16th is 19:00 UTC on the 15th.
    const instant = new Date('2026-09-15T19:00:00Z');
    expect(instant.toISOString().slice(0, 10)).toBe('2026-09-15');
    expect(formatDateKey(instant)).toBe('2026-09-16');
  });

  it('pads month and day', () => {
    expect(formatDateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('monthRange', () => {
  it.each([
    { year: 2026, month: 1, from: '2026-02-01', to: '2026-02-28', days: 28 },
    { year: 2024, month: 1, from: '2024-02-01', to: '2024-02-29', days: 29 },
    { year: 2026, month: 3, from: '2026-04-01', to: '2026-04-30', days: 30 },
    { year: 2026, month: 0, from: '2026-01-01', to: '2026-01-31', days: 31 },
  ])('$from to $to has $days days', ({ year, month, from, to, days }) => {
    const range = monthRange(year, month);
    expect(range.from).toBe(from);
    expect(range.to).toBe(to);
    expect(range.daysInMonth).toBe(days);
  });

  it('rolls a month past December into the next year', () => {
    expect(monthRange(2026, 12).from).toBe('2027-01-01');
    expect(monthRange(2026, -1).to).toBe('2025-12-31');
  });

  it('gives the weekday of the 1st', () => {
    // 1 Sep 2026 is a Tuesday.
    expect(monthRange(2026, 8).firstWeekday).toBe(2);
  });
});

describe('lastNDaysRange', () => {
  it('is inclusive at both ends: n dates ending today', () => {
    vi.useFakeTimers({ now: new Date('2026-09-15T06:00:00Z') });
    const range = lastNDaysRange(7);
    expect(range).toEqual({ from: '2026-09-09', to: '2026-09-15' });
    expect(daysBetween(range.from, range.to) + 1).toBe(7);
  });

  it('crosses a month boundary', () => {
    vi.useFakeTimers({ now: new Date('2026-03-02T06:00:00Z') });
    expect(lastNDaysRange(3)).toEqual({ from: '2026-02-28', to: '2026-03-02' });
  });

  it('is just today for n = 1', () => {
    vi.useFakeTimers({ now: new Date('2026-09-15T06:00:00Z') });
    expect(lastNDaysRange(1)).toEqual({ from: '2026-09-15', to: '2026-09-15' });
  });
});

describe('lastMonthsRange', () => {
  it('runs from the day after the same date a month back', () => {
    vi.useFakeTimers({ now: new Date('2026-09-15T06:00:00Z') });
    expect(lastMonthsRange(1)).toEqual({ from: '2026-08-16', to: '2026-09-15' });
  });

  it('clamps a day the earlier month lacks', () => {
    vi.useFakeTimers({ now: new Date('2026-03-31T06:00:00Z') });
    expect(lastMonthsRange(1)).toEqual({ from: '2026-03-01', to: '2026-03-31' });
  });
});
