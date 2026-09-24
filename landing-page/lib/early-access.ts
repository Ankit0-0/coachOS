/**
 * The landing page's one call to the backend: the public early-access endpoint.
 * There is no Next.js API route any more — the backend owns the database, so a
 * signup goes straight to it.
 */

export type DevicePlatform = 'IOS' | 'ANDROID';

/** Which app someone is waiting for: coaches and clients use different apps. */
export type Audience = 'COACH' | 'CLIENT';

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/v1').replace(/\/+$/, '');

/** Good enough to catch a typo in the browser; the backend validates properly. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email.trim());
}

export class EarlyAccessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EarlyAccessError';
  }
}

/**
 * Sends a signup. Resolves on success; rejects with copy a person can read —
 * never a status code, and never a hint about whether the address was already
 * on the list (the backend answers a repeat exactly like a first signup).
 */
export async function submitEarlyAccess(input: {
  email: string;
  platform: DevicePlatform;
  audience: Audience;
}): Promise<void> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/early-access`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // `audience` is not stored yet: the backend's schema strips keys it does
      // not know, so it is dropped rather than rejected until a column exists.
      body: JSON.stringify({ email: input.email.trim(), platform: input.platform, audience: input.audience }),
    });
  } catch {
    throw new EarlyAccessError("We couldn't reach the server. Check your connection and try again.");
  }

  if (response.ok) return;

  if (response.status === 429) {
    throw new EarlyAccessError('Too many attempts. Try again in a few minutes.');
  }
  if (response.status === 400) {
    throw new EarlyAccessError('That email address looks wrong. Check it and try again.');
  }
  throw new EarlyAccessError('Something went wrong on our end. Please try again.');
}
