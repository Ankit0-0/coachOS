import { describe, expect, it } from 'vitest';

import { formatCalories, formatDuration } from '@/lib/plan-units';

describe('formatCalories', () => {
  it('appends kcal to a bare number and groups thousands', () => {
    expect(formatCalories('2200')).toBe('2,200 kcal');
    expect(formatCalories('950')).toBe('950 kcal');
    expect(formatCalories('1800-2000')).toBe('1,800-2,000 kcal');
  });

  it('leaves text that already has a unit as written', () => {
    expect(formatCalories('1,950 kcal')).toBe('1,950 kcal');
    expect(formatCalories(' about 2k ')).toBe('about 2k');
  });

  it('keeps an empty value empty rather than showing a lone unit', () => {
    expect(formatCalories('')).toBe('');
    expect(formatCalories('   ')).toBe('');
  });
});

describe('formatDuration', () => {
  it('appends min to a bare number', () => {
    expect(formatDuration('45')).toBe('45 min');
    expect(formatDuration('1.5')).toBe('1.5 min');
  });

  it('leaves text that already has a unit as written', () => {
    expect(formatDuration('42 min')).toBe('42 min');
    expect(formatDuration('1 hr')).toBe('1 hr');
  });
});
