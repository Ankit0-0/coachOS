import { describe, expect, it } from 'vitest';

import { addMonths, isDateKey } from '@/lib/dates';
import { defaultPeriod, periodError, periodInput, presetOf } from '@/lib/subscription-period';

describe('addMonths', () => {
  it('moves to the same day months later', () => {
    expect(addMonths('2026-09-26', 3)).toBe('2026-12-26');
    expect(addMonths('2026-11-15', 3)).toBe('2027-02-15');
  });

  it('clamps to the end of a shorter month', () => {
    expect(addMonths('2026-11-30', 3)).toBe('2027-02-28');
    expect(addMonths('2027-11-30', 3)).toBe('2028-02-29');
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
  });
});

describe('isDateKey', () => {
  it('accepts real dates only', () => {
    expect(isDateKey('2026-02-28')).toBe(true);
    expect(isDateKey('2026-02-30')).toBe(false);
    expect(isDateKey('26-2-28')).toBe(false);
    expect(isDateKey('')).toBe(false);
  });
});

describe('defaultPeriod', () => {
  it('starts today and ends three months out', () => {
    expect(defaultPeriod('2026-09-26')).toEqual({ start: '2026-09-26', end: '2026-12-26' });
  });
});

describe('presetOf', () => {
  it('recognises a preset length, open-ended, and custom dates', () => {
    expect(presetOf({ start: '2026-09-26', end: '2026-12-26' })).toBe(3);
    expect(presetOf({ start: '2026-09-26', end: '2027-09-26' })).toBe(12);
    expect(presetOf(null)).toBe('open');
    expect(presetOf({ start: '2026-09-26', end: '2026-10-10' })).toBeNull();
  });
});

describe('periodError', () => {
  const today = '2026-09-26';

  it('accepts the default and an open-ended relationship', () => {
    expect(periodError(defaultPeriod(today), today)).toBeNull();
    expect(periodError(null, today)).toBeNull();
  });

  it('allows a start date in the past, since the coach may already have been paid', () => {
    expect(periodError({ start: '2026-09-01', end: '2026-12-01' }, today)).toBeNull();
  });

  it('rejects an end on or before the start', () => {
    expect(periodError({ start: '2026-10-01', end: '2026-10-01' }, today)).toMatch(/after the start/);
    expect(periodError({ start: '2026-10-01', end: '2026-09-30' }, today)).toMatch(/after the start/);
  });

  it('rejects a period that has already ended, and malformed dates', () => {
    expect(periodError({ start: '2026-08-01', end: '2026-09-25' }, today)).toMatch(/already ended/);
    expect(periodError({ start: '2026-9-1', end: '2026-12-01' }, today)).toMatch(/YYYY-MM-DD/);
  });
});

describe('periodInput', () => {
  it('maps a draft to the API fields, and open-ended to null', () => {
    expect(periodInput({ start: '2026-09-26', end: '2026-12-26' })).toEqual({
      subscriptionStartDate: '2026-09-26',
      subscriptionEndDate: '2026-12-26',
    });
    expect(periodInput(null)).toBeNull();
  });
});
