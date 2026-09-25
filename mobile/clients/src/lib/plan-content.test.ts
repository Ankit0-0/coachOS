import { describe, expect, it } from 'vitest';

import { cycleDayLabel, parseDietContent, parseWorkoutContent, workoutExercisesFrom } from '@/lib/plan-content';

describe('parseWorkoutContent', () => {
  it('reads a one-day cycle, the shape the backend sends for a legacy single-day plan', () => {
    const content = parseWorkoutContent({
      focus: 'Strength',
      summary: 'Full body',
      difficulty: 'Beginner',
      days: [{ dayIndex: 0, label: '', isRestDay: false, duration: '45', exercises: [{ id: 'e1', name: 'Squat', note: '', sets: 3 }] }],
    });
    expect(content?.days).toHaveLength(1);
    expect(content?.days[0]?.exercises[0]).toMatchObject({ id: 'e1', name: 'Squat', sets: 3 });
  });

  it('rejects content that is not cycle-shaped rather than half-reading it', () => {
    // Legacy content is normalised server-side (normalizePlanContent); the app
    // only ever accepts `days`.
    expect(parseWorkoutContent({ exercises: [{ id: 'e1', name: 'Squat', sets: 3 }] })).toBeNull();
    expect(parseWorkoutContent(null)).toBeNull();
    expect(parseWorkoutContent([])).toBeNull();
  });

  it('drops malformed exercises and floors set counts', () => {
    const content = parseWorkoutContent({
      days: [{ exercises: [{ id: 'e1', name: 'Row', sets: 3.7 }, { name: 'No id', sets: 3 }, { id: 'e2', sets: '4' }, 'junk'] }],
    });
    expect(content?.days[0]?.exercises).toEqual([
      { id: 'e1', name: 'Row', note: '', sets: 3, reps: undefined, rest: undefined },
    ]);
  });
});

describe('parseDietContent', () => {
  it('reads meals and ignores ones without an id', () => {
    const content = parseDietContent({
      days: [{ calories: '1950', meals: [{ id: 'm1', label: 'Poha' }, { label: 'No id' }] }],
    });
    expect(content?.days[0]).toMatchObject({ dayIndex: 0, calories: '1950', meals: [{ id: 'm1', label: 'Poha' }] });
  });
});

describe('workoutExercisesFrom', () => {
  it('expands set counts into numbered, checkable rows', () => {
    const [exercise] = workoutExercisesFrom({
      dayIndex: 0,
      label: '',
      isRestDay: false,
      duration: '',
      exercises: [{ id: 'e1', name: 'Bench', note: '', sets: 2, reps: '8' }],
    });
    expect(exercise?.sets).toEqual([
      { id: 'e1-set1', setNumber: 1, reps: '8', rest: '—' },
      { id: 'e1-set2', setNumber: 2, reps: '8', rest: '—' },
    ]);
  });
});

describe('cycleDayLabel', () => {
  it('says "Day 1" for a one-day cycle, without "of 1"', () => {
    expect(cycleDayLabel({ dayIndex: 0, cycleLengthDays: 1, label: '' })).toBe('Day 1');
  });

  it('includes the cycle length and label for a rotating plan', () => {
    expect(cycleDayLabel({ dayIndex: 2, cycleLengthDays: 7, label: 'Pull' })).toBe('Day 3 of 7 · Pull');
  });
});
