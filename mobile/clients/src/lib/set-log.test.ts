import { describe, expect, it } from 'vitest';

import type { ExerciseHistory } from '@/lib/api';
import { formatSetLog, lastSessionFor, parseSetLog, setLogText } from '@/lib/set-log';

describe('parseSetLog', () => {
  it('reads weight and reps, accepting a comma as the decimal point', () => {
    expect(parseSetLog('62,5', '6')).toEqual({ weightKg: 62.5, reps: 6 });
    expect(parseSetLog(' 40 ', '')).toEqual({ weightKg: 40, reps: null });
    expect(parseSetLog('', '12')).toEqual({ weightKg: null, reps: 12 });
  });

  it('is null with both blank, and undefined for anything that is not a number', () => {
    expect(parseSetLog('', '  ')).toBeNull();
    expect(parseSetLog('abc', '8')).toBeUndefined();
    expect(parseSetLog('40', '7.5')).toBeUndefined();
    expect(parseSetLog('-5', '8')).toBeUndefined();
    expect(parseSetLog('5000', '8')).toBeUndefined();
  });
});

describe('formatSetLog and setLogText', () => {
  it('formats what was logged', () => {
    expect(formatSetLog({ weightKg: 62.5, reps: 6 })).toBe('62.5 kg × 6');
    expect(formatSetLog({ weightKg: null, reps: 12 })).toBe('× 12');
    expect(formatSetLog({ weightKg: 40, reps: null })).toBe('40 kg');
    expect(formatSetLog(undefined)).toBe('');
  });

  it('turns a saved log back into field text', () => {
    expect(setLogText({ weightKg: 62.5, reps: null })).toEqual({ weightKg: '62.5', reps: '' });
    expect(setLogText(undefined)).toEqual({ weightKg: '', reps: '' });
  });
});

describe('lastSessionFor', () => {
  const history: ExerciseHistory[] = [
    {
      name: 'Bench press',
      sessions: [
        { date: '2026-10-06', sets: [{ weightKg: 60, reps: 8 }], topSet: { weightKg: 60, reps: 8 }, volumeKg: 480 },
        { date: '2026-10-09', sets: [{ weightKg: 62.5, reps: 6 }], topSet: { weightKg: 62.5, reps: 6 }, volumeKg: 375 },
        { date: '2026-10-13', sets: [{ weightKg: 65, reps: 5 }], topSet: { weightKg: 65, reps: 5 }, volumeKg: 325 },
      ],
      best: { weightKg: 65, reps: 5, date: '2026-10-13' },
    },
  ];

  it('finds the latest session before today, matching the name loosely', () => {
    expect(lastSessionFor(history, ' bench PRESS', '2026-10-13')).toEqual({
      date: '2026-10-09',
      sets: [{ weightKg: 62.5, reps: 6 }],
    });
  });

  it('is null for an exercise never logged before', () => {
    expect(lastSessionFor(history, 'Squat', '2026-10-13')).toBeNull();
    expect(lastSessionFor(history, 'Bench press', '2026-10-06')).toBeNull();
  });
});
