import { describe, expect, it } from 'vitest';

import type { DietDayContent, Plan, WorkoutDayContent } from '@/lib/api';
import { planStats, toPlanListEntry } from '@/lib/plan-format';

function workoutDay(overrides: Partial<WorkoutDayContent> = {}): WorkoutDayContent {
  return { dayIndex: 0, label: '', isRestDay: false, duration: '45', exercises: [], ...overrides };
}

function dietDay(overrides: Partial<DietDayContent> = {}): DietDayContent {
  return { dayIndex: 0, label: '', calories: '1950', meals: [], ...overrides };
}

function plan(overrides: Partial<Plan>): Plan {
  return {
    id: 'p1',
    type: 'WORKOUT',
    title: 'Plan',
    description: null,
    content: { focus: '', summary: 'Summary', difficulty: '', days: [workoutDay()] },
    cycleLengthDays: 1,
    isDefault: false,
    createdById: 'c1',
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    ...overrides,
  };
}

const exercise = (id: string) => ({ id, name: id, note: '', sets: 3 });
const meal = (id: string) => ({ id, label: id });

describe('planStats', () => {
  it('describes a one-day workout by its contents, with the duration unit appended', () => {
    const stats = planStats(
      plan({ content: { focus: '', summary: '', difficulty: '', days: [workoutDay({ exercises: [exercise('a'), exercise('b')] })] } }),
    );
    expect(stats).toEqual({ primary: '2 exercises', secondary: '45 min' });
  });

  it('describes a one-day diet with the kcal unit appended', () => {
    const stats = planStats(
      plan({ type: 'DIET', content: { focus: '', summary: '', days: [dietDay({ meals: [meal('m1')] })] } }),
    );
    expect(stats).toEqual({ primary: '1 meal', secondary: '1,950 kcal' });
  });

  it('leads a rotating plan with its cycle length', () => {
    const days = [workoutDay(), workoutDay({ dayIndex: 1, isRestDay: true }), workoutDay({ dayIndex: 2 })];
    expect(planStats(plan({ content: { focus: '', summary: '', difficulty: '', days }, cycleLengthDays: 3 }))).toEqual({
      primary: '3-day cycle',
      secondary: '2 training',
    });
  });

  it('copes with a plan that has no days yet', () => {
    expect(planStats(plan({ content: { focus: '', summary: '', difficulty: '', days: [] } }))).toEqual({
      primary: '0 exercises',
      secondary: '',
    });
  });
});

describe('toPlanListEntry', () => {
  it('carries the id, title and both stats', () => {
    expect(toPlanListEntry(plan({ title: 'Legs' }))).toEqual({
      id: 'p1',
      title: 'Legs',
      primaryStat: '0 exercises',
      secondaryStat: '45 min',
    });
  });
});
