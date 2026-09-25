import { describe, expect, it } from 'vitest';

import { expiredInviteMessage, inviteSwitchWarning, requestSwitchWarning } from '@/lib/coach-switch';

const current = { id: 'c1', name: 'Asha Rao', hasActivePlan: true };

describe('inviteSwitchWarning', () => {
  it('names the current coach and the active plan', () => {
    expect(inviteSwitchWarning(current)).toBe(
      "You're currently with Asha Rao and have an active plan. Accepting this will end that and remove their access to your progress. Continue?",
    );
  });

  it('leaves out the plan when there is none', () => {
    expect(inviteSwitchWarning({ ...current, hasActivePlan: false })).toBe(
      "You're currently with Asha Rao. Accepting this will end that and remove their access to your progress. Continue?",
    );
  });
});

describe('requestSwitchWarning', () => {
  it('names both coaches', () => {
    const text = requestSwitchWarning(current, 'Vikram Shah');
    expect(text).toContain('Asha Rao and have an active plan');
    expect(text).toContain('If Vikram Shah accepts your request');
  });
});

describe('expiredInviteMessage', () => {
  it('tells the client to ask for a new invite', () => {
    expect(expiredInviteMessage('Vikram Shah')).toContain('Ask Vikram Shah to send a new invite.');
    expect(expiredInviteMessage(undefined)).toContain('Ask your coach');
  });
});
