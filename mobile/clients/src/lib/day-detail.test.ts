import { describe, expect, it } from 'vitest';

import { buildDaySections } from '@/lib/day-detail';

const workout = {
  assignmentId: 'a-workout',
  type: 'WORKOUT' as const,
  title: 'Strength block',
  dayIndex: 5,
  cycleLengthDays: 7,
  label: 'Conditioning',
  isRestDay: false,
  itemIds: ['d5-row-set1', 'd5-row-set2', 'd5-row-set3', 'd5-plank-set1'],
  content: {
    exercises: [
      { id: 'd5-row', name: 'Row', sets: 3, reps: '8-10' },
      { id: 'd5-plank', name: 'Plank', sets: 1 },
    ],
  },
};

const diet = {
  assignmentId: 'a-diet',
  type: 'DIET' as const,
  title: 'Lean bulk',
  dayIndex: 0,
  cycleLengthDays: 1,
  label: 'Every day',
  isRestDay: false,
  itemIds: ['breakfast', 'lunch'],
  content: { meals: [{ id: 'breakfast', label: 'Poha' }, { id: 'lunch', label: 'Dal chawal' }] },
};

describe('buildDaySections', () => {
  it('scores a partial workout per exercise and overall, like the ring', () => {
    const [section] = buildDaySections(
      [workout],
      [{ assignmentId: 'a-workout', completedItemIds: ['d5-row-set1', 'd5-row-set2', 'old-id'], notes: ' Tired ', photoUrls: null }],
    );
    expect(section).toMatchObject({ cycleLabel: 'Day 6 of 7 · Conditioning', completed: 2, total: 4, percent: 50 });
    expect(section?.items.map((item) => [item.name, item.done, item.total, item.detail])).toEqual([
      ['Row', 2, 3, '3 sets · 8-10 reps'],
      ['Plank', 0, 1, '1 set'],
    ]);
    expect(section?.notes).toBe('Tired');
    expect(section?.logged).toBe(true);
  });

  it('marks meals done and attaches their photos', () => {
    const [section] = buildDaySections(
      [diet],
      [{ assignmentId: 'a-diet', completedItemIds: ['lunch'], notes: null, photoUrls: { lunch: 'https://x/lunch.jpg' } }],
    );
    expect(section?.cycleLabel).toBe('Every day');
    expect(section?.percent).toBe(50);
    expect(section?.items).toEqual([
      { id: 'breakfast', name: 'Poha', detail: null, done: 0, total: 1, photoUrl: null },
      { id: 'lunch', name: 'Dal chawal', detail: null, done: 1, total: 1, photoUrl: 'https://x/lunch.jpg' },
    ]);
  });

  it('keeps an unlogged day apart from a rest day', () => {
    const [unlogged] = buildDaySections([workout], []);
    expect(unlogged).toMatchObject({ logged: false, isRestDay: false, percent: 0 });
    expect(unlogged?.items).toHaveLength(2);

    const [rest] = buildDaySections([{ ...workout, isRestDay: true, itemIds: [], content: { exercises: [] } }], []);
    expect(rest).toMatchObject({ isRestDay: true, items: [], total: 0 });
  });

  it('ignores a check-in from another plan', () => {
    const [section] = buildDaySections(
      [workout],
      [{ assignmentId: 'other', completedItemIds: ['d5-row-set1'], notes: null, photoUrls: null }],
    );
    expect(section).toMatchObject({ logged: false, completed: 0 });
  });

  it('orders workout before diet, and returns nothing for an unplanned day', () => {
    expect(buildDaySections([diet, workout], []).map((section) => section.type)).toEqual(['WORKOUT', 'DIET']);
    expect(buildDaySections([], [])).toEqual([]);
  });
});
