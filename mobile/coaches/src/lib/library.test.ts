import { describe, expect, it } from 'vitest';

import { groupResults, hasExactName } from '@/lib/library';

type Item = { name: string; day: 'PUSH' | 'PULL' | 'LEGS' | null };

const order: ('PUSH' | 'PULL' | 'LEGS')[] = ['PUSH', 'PULL', 'LEGS'];
const groupOf = (item: Item) => item.day;

const items: Item[] = [
  { name: 'Squat', day: 'LEGS' },
  { name: 'Plank', day: null },
  { name: 'Bench press', day: 'PUSH' },
  { name: 'Leg press', day: 'LEGS' },
];

describe('groupResults', () => {
  it('orders groups by their best match while searching, keeping the ranking inside each', () => {
    const groups = groupResults(items, groupOf, order, true);
    expect(groups.map((group) => group.key)).toEqual(['LEGS', 'PUSH', null]);
    expect(groups[0].items.map((item) => item.name)).toEqual(['Squat', 'Leg press']);
  });

  it('follows the fixed order with nothing typed, ungrouped entries last', () => {
    const groups = groupResults(items, groupOf, order, false);
    expect(groups.map((group) => group.key)).toEqual(['PUSH', 'LEGS', null]);
  });

  it('returns no groups for no results', () => {
    expect(groupResults([], groupOf, order, true)).toEqual([]);
  });
});

describe('hasExactName', () => {
  it('matches regardless of case and surrounding spaces', () => {
    expect(hasExactName([{ name: 'Bench press' }], '  bench PRESS ')).toBe(true);
  });

  it('does not treat a partial match or a blank as the same name', () => {
    expect(hasExactName([{ name: 'Bench press' }], 'bench')).toBe(false);
    expect(hasExactName([{ name: 'Bench press' }], '   ')).toBe(false);
  });
});
