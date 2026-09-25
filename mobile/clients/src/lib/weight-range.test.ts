import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_WEIGHT_RANGE, WEIGHT_RANGES, weightRangeDates } from '@/lib/weight-range';

beforeEach(() => {
  // 11:30 IST on 15 Sep 2026.
  vi.useFakeTimers({ now: new Date('2026-09-15T06:00:00Z') });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('weightRangeDates', () => {
  it.each([
    { key: 'week', from: '2026-09-09' },
    { key: 'month', from: '2026-08-16' },
    { key: 'quarter', from: '2026-06-16' },
    { key: 'year', from: '2025-09-16' },
  ] as const)('$key runs from $from to today', ({ key, from }) => {
    expect(weightRangeDates(key)).toEqual({ from, to: '2026-09-15' });
  });

  it('has a range for every option the selector offers, including the default', () => {
    for (const range of WEIGHT_RANGES) expect(() => weightRangeDates(range.key)).not.toThrow();
    expect(WEIGHT_RANGES.map((range) => range.key)).toContain(DEFAULT_WEIGHT_RANGE);
  });
});
