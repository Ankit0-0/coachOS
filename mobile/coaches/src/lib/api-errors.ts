/**
 * Human copy for failed API requests.
 *
 * The backend answers a failure with a bare status code and no body (see
 * backend/AGENTS.md), so the words a person reads have to come from here. The
 * same status means different things on different endpoints — a 401 from the
 * login form is a wrong password, a 401 anywhere else is an expired session —
 * so the copy is chosen by the request as well as by the status.
 *
 * Nothing here ever shows a status code. The status and payload are logged
 * where the request fails (lib/api.ts), which is where debugging should look.
 */

export const CONNECTION_MESSAGE =
  'Unable to reach the server. Check your connection and confirm the backend is running.';

export const GENERIC_MESSAGE = 'Something went wrong. Please try again.';

/** Which kind of request failed, as far as the copy is concerned. */
export type ApiErrorContext =
  | 'login'
  | 'signup'
  | 'forgotPassword'
  | 'resetPassword'
  | 'googleSignIn'
  /** Any request made while signed in. */
  | 'session';

const CONTEXT_BY_ENDPOINT: Record<string, ApiErrorContext> = {
  'POST /auth/login': 'login',
  'POST /auth/register': 'signup',
  'POST /auth/forgot-password': 'forgotPassword',
  'POST /auth/reset-password': 'resetPassword',
  'POST /auth/google': 'googleSignIn',
};

export function contextForRequest(method: string, path: string): ApiErrorContext {
  const route = path.split('?')[0];
  return CONTEXT_BY_ENDPOINT[`${method.toUpperCase()} ${route}`] ?? 'session';
}

/** The copy for one status on one kind of request. Every status gets words; none gets its number. */
export function messageForStatus(status: number, context: ApiErrorContext): string {
  if (status === 0) return CONNECTION_MESSAGE;

  switch (context) {
    case 'login':
      // One message for an unknown email and a wrong password alike. Saying
      // which would let anyone test whether an address has an account — the
      // thing forgot-password is careful never to reveal.
      if (status === 400 || status === 401) return 'Invalid email or password.';
      break;
    case 'signup':
      // Specific on purpose: the person is claiming this address themselves.
      if (status === 409) return 'An account with this email already exists. Try signing in instead.';
      if (status === 400) return 'Check your details: a valid email address and a password of at least 8 characters.';
      break;
    case 'forgotPassword':
      if (status === 400) return 'Enter a valid email address.';
      break;
    case 'resetPassword':
      // The server gives one status for a wrong, expired, or used code.
      if (status === 400 || status === 401) return 'That code is invalid or has expired. Request a new one.';
      break;
    case 'googleSignIn':
      if (status === 401) return 'Google sign-in didn’t go through. Please try again.';
      if (status === 503) return 'Google sign-in isn’t available right now. Use your email and password instead.';
      break;
    case 'session':
      if (status === 401) return 'Your session has expired. Please sign in again.';
      break;
  }

  if (status === 400) return 'Some of those details aren’t valid. Check them and try again.';
  if (status === 403) return 'You don’t have permission to do that.';
  if (status === 429) return 'Too many attempts. Please wait a moment and try again.';
  if (status >= 500) return 'Something went wrong on our end. Please try again.';
  return GENERIC_MESSAGE;
}

/**
 * What to show for anything a screen caught. API failures already carry their
 * copy (lib/api.ts builds it); an error thrown on purpose elsewhere in the app
 * keeps its own message; anything else gets the generic line.
 */
export function describeError(error: unknown): string {
  return error instanceof Error && error.message ? error.message : GENERIC_MESSAGE;
}
