import { describe, expect, it } from 'vitest';

import { summarizeWeights } from '@/lib/weight-summary';

describe('summarizeWeights', () => {
  it('is null with nothing logged', () => {
    expect(summarizeWeights([])).toBeNull();
  });

  it('takes the newest entry as latest, whatever the order', () => {
    const summary = summarizeWeights([
      { date: '2026-09-22', weightKg: 71.2 },
      { date: '2026-09-20', weightKg: 72 },
    ]);
    expect(summary?.latest).toEqual({ weightKg: 71.2, date: '2026-09-22' });
  });

  it('averages only the 7 days ending on the latest entry', () => {
    const summary = summarizeWeights([
      { date: '2026-09-01', weightKg: 88 },
      { date: '2026-09-15', weightKg: 80 }, // 8 days before: outside
      { date: '2026-09-16', weightKg: 72 }, // 6 days before: inside
      { date: '2026-09-19', weightKg: 71.5 },
      { date: '2026-09-22', weightKg: 71.2 },
    ]);
    expect(summary?.sevenDayAverageKg).toBe(71.6);
  });

  it('is the entry itself when there is only one', () => {
    expect(summarizeWeights([{ date: '2026-09-22', weightKg: 70 }])).toEqual({
      latest: { weightKg: 70, date: '2026-09-22' },
      sevenDayAverageKg: 70,
    });
  });

  it('still averages the last logged week after a gap', () => {
    const summary = summarizeWeights([
      { date: '2026-06-01', weightKg: 75 },
      { date: '2026-06-03', weightKg: 74 },
    ]);
    expect(summary?.sevenDayAverageKg).toBe(74.5);
  });
});
