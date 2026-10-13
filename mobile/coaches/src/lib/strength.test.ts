import { describe, expect, it } from 'vitest';

import type { ExerciseHistory } from '@/lib/api';
import { changeLabel, formatLift, strengthRows } from '@/lib/strength';

const session = (date: string, weightKg: number | null, reps: number | null) => ({
  date,
  sets: [{ weightKg, reps }],
  topSet: { weightKg, reps },
  volumeKg: (weightKg ?? 0) * (reps ?? 0),
});

describe('strengthRows', () => {
  it('summarises each exercise: best, latest and the change since the first session', () => {
    const history: ExerciseHistory[] = [
      {
        name: 'Bench press',
        sessions: [session('2026-09-01', 60, 8), session('2026-09-15', 65, 5)],
        best: { weightKg: 65, reps: 5, date: '2026-09-15' },
      },
      { name: 'Push-up', sessions: [session('2026-09-02', null, 20), session('2026-09-09', null, 25)], best: null },
      { name: 'Squat', sessions: [session('2026-09-03', 80, 5)], best: { weightKg: 80, reps: 5, date: '2026-09-03' } },
    ];

    expect(strengthRows(history)).toEqual([
      {
        name: 'Bench press',
        best: { weightKg: 65, reps: 5, date: '2026-09-15' },
        latest: { weightKg: 65, reps: 5 },
        latestDate: '2026-09-15',
        sessions: 2,
        changeKg: 5,
      },
      {
        name: 'Push-up',
        best: null,
        latest: { weightKg: null, reps: 25 },
        latestDate: '2026-09-09',
        sessions: 2,
        changeKg: null,
      },
      {
        name: 'Squat',
        best: { weightKg: 80, reps: 5, date: '2026-09-03' },
        latest: { weightKg: 80, reps: 5 },
        latestDate: '2026-09-03',
        sessions: 1,
        changeKg: null,
      },
    ]);
  });
});

describe('formatLift and changeLabel', () => {
  it('words lifts and changes', () => {
    expect(formatLift({ weightKg: 62.5, reps: 6 })).toBe('62.5 kg × 6');
    expect(formatLift({ weightKg: null, reps: 12 })).toBe('× 12');
    expect(formatLift(null)).toBe('—');
    expect(changeLabel(2.5)).toBe('+2.5 kg');
    expect(changeLabel(-5)).toBe('−5 kg');
    expect(changeLabel(0)).toBe('No change');
    expect(changeLabel(null)).toBeNull();
  });
});
