import { Platform } from 'react-native';

import { loadAccessToken } from '@/lib/token-storage';

export type Role = 'CLIENT' | 'COACH';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface AuthPayload {
  user: AuthUser;
  accessToken: string;
}

/**
 * Resolve the backend base URL.
 * - Uses EXPO_PUBLIC_API_URL from the app's `.env` when provided.
 * - Falls back to a sensible local default per platform.
 * - On Android emulators, `localhost` / `127.0.0.1` point at the emulator
 *   itself, so they are rewritten to the host loopback alias `10.0.2.2`.
 */
export const API_BASE_URL = (() => {
  const configured = (process.env.EXPO_PUBLIC_API_URL ?? '').trim().replace(/\/+$/, '');
  const fallback =
    Platform.OS === 'android' ? 'http://10.0.2.2:4000/v1' : 'http://localhost:4000/v1';
  let base = configured || fallback;
  if (Platform.OS === 'android') {
    base = base.replace(/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?/, 'http://10.0.2.2$2');
  }
  return base;
})();

export class ApiError extends Error {
  readonly status: number;
  readonly payload: unknown;

  constructor(status: number, message: string, payload?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Attach the stored bearer token. Defaults to true. */
  auth?: boolean;
}

async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true } = options;

  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth) {
    const token = await loadAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(
      0,
      'Unable to reach the server. Check your connection and confirm the backend is running.',
    );
  }

  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    // Non-JSON response body — leave data null.
  }

  if (!response.ok) {
    const serverMessage =
      data && typeof data === 'object' && 'message' in data
        ? (data as { message?: unknown }).message
        : undefined;
    const message =
      typeof serverMessage === 'string'
        ? serverMessage
        : `Request failed with status ${response.status}.`;
    throw new ApiError(response.status, message, data);
  }

  return data as T;
}

export const authApi = {
  signIn(input: { email: string; password: string }): Promise<AuthPayload> {
    return apiRequest<AuthPayload>('/auth/login', {
      method: 'POST',
      body: input,
      auth: false,
    });
  },

  signUp(input: { name: string; email: string; password: string }): Promise<AuthPayload> {
    return apiRequest<AuthPayload>('/auth/register', {
      method: 'POST',
      body: { ...input, role: 'COACH' as Role },
      auth: false,
    });
  },

  signInWithGoogle(idToken: string): Promise<AuthPayload> {
    return apiRequest<AuthPayload>('/auth/google', {
      method: 'POST',
      body: { idToken, role: 'COACH' as Role },
      auth: false,
    });
  },
};

/** Fetch the current user from the backend using the stored token. */
export async function fetchCurrentUser(): Promise<AuthUser> {
  const data = await apiRequest<{ user: AuthUser }>('/me');
  return data.user;
}

// ---------------------------------------------------------------------------
// Coach ↔ client invites
// ---------------------------------------------------------------------------

export type InviteStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED';

export interface InvitePerson {
  id: string;
  name: string;
  email: string;
}

export interface CoachInvite {
  id: string;
  coachId: string;
  clientEmail: string;
  clientId: string | null;
  client?: InvitePerson;
  status: InviteStatus;
  createdAt: string;
  respondedAt: string | null;
}

export const coachInviteApi = {
  list(status?: InviteStatus): Promise<CoachInvite[]> {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    return apiRequest<{ invites: CoachInvite[] }>(`/coach/invites${query}`).then(
      (data) => data.invites,
    );
  },

  create(clientEmail: string): Promise<CoachInvite> {
    return apiRequest<{ invite: CoachInvite }>('/coach/invites', {
      method: 'POST',
      body: { clientEmail },
    }).then((data) => data.invite);
  },
};
