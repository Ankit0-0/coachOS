import { describe, expect, it } from 'vitest';

// The file, not the package entry: the entry pulls in React Native.
import { WEIGHT_AXIS_BASELINE, weightAxis } from '@coachos/theme/src/weight-axis';

describe('weightAxis (shared, @coachos/theme)', () => {
  it('uses the padded baseline', () => {
    expect(WEIGHT_AXIS_BASELINE).toBe('padded');
  });

  it('spreads a 69–72 kg series across most of the axis instead of a flat line', () => {
    const axis = weightAxis([69, 70.4, 71.1, 72]);
    expect(axis.min).toBeGreaterThan(60);
    expect(axis.max).toBeLessThan(80);
    expect((72 - 69) / (axis.max - axis.min)).toBeGreaterThan(0.3);
    expect(axis.ticks[0]).toBe(axis.min);
    expect(axis.ticks[axis.ticks.length - 1]).toBe(axis.max);
  });

  it('gives a single entry about ±5 kg of room', () => {
    const axis = weightAxis([70]);
    expect(axis.min).toBeLessThanOrEqual(65);
    expect(axis.max).toBeGreaterThanOrEqual(75);
    expect(axis.max - axis.min).toBeLessThanOrEqual(12);
  });

  it('treats identical entries like a single one', () => {
    expect(weightAxis([70, 70, 70])).toEqual(weightAxis([70]));
  });

  it('never goes below 0 kg', () => {
    expect(weightAxis([2]).min).toBe(0);
  });
});
