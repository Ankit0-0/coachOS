import { describe, expect, it } from 'vitest';

import {
  CONNECTION_MESSAGE,
  GENERIC_MESSAGE,
  contextForRequest,
  describeError,
  messageForStatus,
  type ApiErrorContext,
} from '@/lib/api-errors';

const CONTEXTS: ApiErrorContext[] = ['login', 'signup', 'forgotPassword', 'resetPassword', 'googleSignIn', 'session'];

describe('contextForRequest', () => {
  it('recognises the login endpoint regardless of method case and query', () => {
    expect(contextForRequest('post', '/auth/login?next=home')).toBe('login');
  });

  it('treats anything else as a signed-in request', () => {
    expect(contextForRequest('GET', '/client/invites')).toBe('session');
  });
});

describe('messageForStatus', () => {
  it('maps a 401 on login to the invalid-credentials copy', () => {
    expect(messageForStatus(401, contextForRequest('POST', '/auth/login'))).toBe('Invalid email or password.');
  });

  it('maps a 401 elsewhere to an expired session', () => {
    expect(messageForStatus(401, 'session')).toBe('Your session has expired. Please sign in again.');
  });

  it('reports no connection for status 0', () => {
    expect(messageForStatus(0, 'login')).toBe(CONNECTION_MESSAGE);
  });

  it('falls back to the generic line for an unmapped status', () => {
    expect(messageForStatus(418, 'session')).toBe(GENERIC_MESSAGE);
  });

  it('never puts a status code in user-facing text', () => {
    for (const context of CONTEXTS) {
      for (const status of [0, 302, 400, 401, 403, 404, 409, 418, 422, 429, 500, 503, 599]) {
        const message = messageForStatus(status, context);
        expect(message, `${status} / ${context}`).not.toContain(String(status));
        expect(message.trim()).not.toBe('');
      }
    }
  });
});

describe('describeError', () => {
  it('keeps an Error message and falls back for anything else', () => {
    expect(describeError(new Error('Plan not found.'))).toBe('Plan not found.');
    expect(describeError('boom')).toBe(GENERIC_MESSAGE);
    expect(describeError(new Error(''))).toBe(GENERIC_MESSAGE);
  });
});
