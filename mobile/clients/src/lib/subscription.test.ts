import { describe, expect, it } from 'vitest';

import type { ClientSubscription } from '@/lib/api';
import { summariseSubscription } from '@/lib/subscription';

function subscription(overrides: Partial<ClientSubscription>): ClientSubscription {
  return {
    id: 's1',
    coachId: 'c1',
    clientId: 'u1',
    startDate: '2026-08-26T00:00:00.000Z',
    endDate: '2026-10-01T00:00:00.000Z',
    status: 'ACTIVE',
    storedStatus: 'ACTIVE',
    daysRemaining: 16,
    notes: null,
    coach: { id: 'c1', name: 'Coach', email: 'coach@example.com' },
    ...overrides,
  };
}

// Expiry and days remaining are computed by the API; this module only words them.
describe('summariseSubscription', () => {
  it('reports an expired period with its end date', () => {
    const summary = summariseSubscription(subscription({ status: 'EXPIRED', daysRemaining: 0 }));
    expect(summary).toMatchObject({ label: 'Expired', tone: 'warning', endHeading: 'Ended' });
    expect(summary.detail).toBe('Expired on Oct 1, 2026');
  });

  it('words days remaining, singular and on the last day', () => {
    expect(summariseSubscription(subscription({ daysRemaining: 16 })).detail).toBe('16 days left');
    expect(summariseSubscription(subscription({ daysRemaining: 1 })).detail).toBe('1 day left');
    expect(summariseSubscription(subscription({ daysRemaining: 0 })).detail).toBe('Today is the last day');
  });

  it('reads dates as calendar dates, so a UTC-midnight end date keeps its day west of UTC', () => {
    const zone = process.env.TZ;
    process.env.TZ = 'America/Los_Angeles';
    try {
      // new Date() here would be 30 Sep in Los Angeles.
      expect(summariseSubscription(subscription({})).endLabel).toBe('Oct 1, 2026');
    } finally {
      process.env.TZ = zone;
    }
  });

  it('marks a cancelled period as ended', () => {
    expect(summariseSubscription(subscription({ status: 'CANCELLED' }))).toMatchObject({
      label: 'Cancelled',
      tone: 'neutral',
      endHeading: 'Ended',
    });
  });
});
