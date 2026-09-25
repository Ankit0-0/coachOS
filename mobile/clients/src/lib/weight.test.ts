import { describe, expect, it } from 'vitest';

import { MAX_WEIGHT_KG, parseWeightInput } from '@/lib/weight';

describe('parseWeightInput', () => {
  it('accepts a normal weight, with a decimal point or comma', () => {
    expect(parseWeightInput('75.5')).toEqual({ status: 'valid', kg: 75.5 });
    expect(parseWeightInput(' 75,5 ')).toEqual({ status: 'valid', kg: 75.5 });
  });

  it('enforces the 150 kg ceiling', () => {
    expect(MAX_WEIGHT_KG).toBe(150);
    expect(parseWeightInput('150')).toEqual({ status: 'valid', kg: 150 });
    expect(parseWeightInput('150.1').status).toBe('invalid');
  });

  it('requires a positive weight', () => {
    expect(parseWeightInput('0').status).toBe('invalid');
    expect(parseWeightInput('-4').status).toBe('invalid');
    expect(parseWeightInput('0.1')).toEqual({ status: 'valid', kg: 0.1 });
  });

  it('refuses text instead of half-reading it', () => {
    for (const input of ['', '75kg', '7 5', 'abc']) {
      const parsed = parseWeightInput(input);
      expect(parsed.status, input).toBe('invalid');
      if (parsed.status === 'invalid') expect(parsed.message).not.toBe('');
    }
  });
});
