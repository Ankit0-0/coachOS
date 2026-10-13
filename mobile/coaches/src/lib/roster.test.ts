import { describe, expect, it } from 'vitest';

import type { CoachInvite } from '@/lib/api';
import { attentionChip, attentionCount, lastCheckInLabel, sortByAttention } from '@/lib/roster';

function client(id: string, attention: CoachInvite['attention']): CoachInvite {
  return {
    id,
    coachId: 'coach',
    clientEmail: `${id}@example.com`,
    clientId: id,
    status: 'ACCEPTED',
    durationMonths: null,
    subscriptionPeriod: null,
    subscriptionStatus: null,
    subscriptionEndDate: null,
    lastCheckInDate: null,
    attention,
    createdAt: '2026-10-01T00:00:00.000Z',
    respondedAt: null,
  };
}

describe('lastCheckInLabel', () => {
  it('names the day relative to today', () => {
    expect(lastCheckInLabel('2026-10-13', '2026-10-13')).toBe('Checked in today');
    expect(lastCheckInLabel('2026-10-12', '2026-10-13')).toBe('Checked in yesterday');
    expect(lastCheckInLabel('2026-10-09', '2026-10-13')).toBe('Checked in 4 days ago');
    expect(lastCheckInLabel(null, '2026-10-13')).toBe('No check-ins yet');
  });

  it("treats a check-in dated after today (the client's time zone is ahead) as today", () => {
    expect(lastCheckInLabel('2026-10-14', '2026-10-13')).toBe('Checked in today');
  });
});

describe('attentionChip', () => {
  it('shows the first, most pressing reason', () => {
    expect(attentionChip(['QUIET', 'RENEWAL_DUE'])).toEqual({ label: 'Gone quiet', tone: 'danger' });
    expect(attentionChip([])).toBeNull();
  });
});

describe('sortByAttention', () => {
  it('moves clients who need the coach to the top, keeping the order otherwise', () => {
    const sorted = sortByAttention([client('a', []), client('b', ['NO_PLAN']), client('c', []), client('d', ['QUIET'])]);
    expect(sorted.map((entry) => entry.id)).toEqual(['b', 'd', 'a', 'c']);
  });

  it('counts the clients who need attention', () => {
    expect(attentionCount([client('a', []), client('b', ['NO_PLAN', 'EXPIRED'])])).toBe(1);
  });
});
