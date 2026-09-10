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
      body: { ...input, role: 'CLIENT' as Role },
      auth: false,
    });
  },

  forgotPassword(email: string): Promise<{ message: string }> {
    return apiRequest<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: { email },
      auth: false,
    });
  },

  resetPassword(input: { email: string; code: string; newPassword: string }): Promise<{ message: string }> {
    return apiRequest<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: input,
      auth: false,
    });
  },

  signInWithGoogle(idToken: string): Promise<AuthPayload> {
    return apiRequest<AuthPayload>('/auth/google', {
      method: 'POST',
      body: { idToken },
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
// Tracking
// ---------------------------------------------------------------------------

export type PlanType = 'WORKOUT' | 'DIET';

export interface TrackingAssignment {
  id: string;
  planId: string;
  type: PlanType;
  title: string;
  content: Record<string, unknown>;
}

export interface CheckIn {
  id: string;
  assignmentId: string;
  date: string;
  completedItemIds: string[];
  notes: string | null;
}

export interface WeightEntry {
  id: string;
  clientId: string;
  date: string;
  weightKg: number;
  photoUrl: string | null;
}

function queryString(params: Record<string, string>): string {
  return Object.entries(params)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
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

export interface ClientInvite {
  id: string;
  coachId: string;
  coach?: InvitePerson;
  clientEmail: string;
  clientId: string | null;
  status: InviteStatus;
  createdAt: string;
  respondedAt: string | null;
}

// ---------------------------------------------------------------------------
// Client profile
// ---------------------------------------------------------------------------

export interface ClientProfile {
  id: string;
  name: string;
  email: string;
  role: Role;
  memberSince: string;
  heightCm: number | null;
  /** Self-reported. Separate from WeightEntry, which is the tracked history. */
  weightKg: number | null;
  goals: string | null;
}

export interface ClientProfileUpdate {
  name?: string;
  heightCm?: number | null;
  weightKg?: number | null;
  goals?: string;
}

export const clientProfileApi = {
  get(): Promise<ClientProfile> {
    return apiRequest<{ profile: ClientProfile }>('/client/profile').then((data) => data.profile);
  },

  update(input: ClientProfileUpdate): Promise<ClientProfile> {
    return apiRequest<{ profile: ClientProfile }>('/client/profile', {
      method: 'PATCH',
      body: input,
    }).then((data) => data.profile);
  },
};

export const clientInviteApi = {
  list(status?: InviteStatus): Promise<ClientInvite[]> {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    return apiRequest<{ invites: ClientInvite[] }>(`/client/invites${query}`).then(
      (data) => data.invites,
    );
  },

  accept(inviteId: string): Promise<ClientInvite> {
    return apiRequest<{ invite: ClientInvite }>(`/client/invites/${inviteId}/accept`, {
      method: 'POST',
    }).then((data) => data.invite);
  },

  decline(inviteId: string): Promise<ClientInvite> {
    return apiRequest<{ invite: ClientInvite }>(`/client/invites/${inviteId}/decline`, {
      method: 'POST',
    }).then((data) => data.invite);
  },
};

export const trackingApi = {
  listAssignments(): Promise<TrackingAssignment[]> {
    return apiRequest<{ assignments: TrackingAssignment[] }>('/tracking/assignments').then(
      (data) => data.assignments,
    );
  },

  saveCheckIn(input: {
    assignmentId: string;
    date: string;
    completedItemIds: string[];
    notes?: string;
  }): Promise<CheckIn> {
    return apiRequest<{ checkIn: CheckIn }>('/tracking/checkin', {
      method: 'POST',
      body: input,
    }).then((data) => data.checkIn);
  },

  listCheckIns(params: { assignmentId: string; from: string; to: string }): Promise<CheckIn[]> {
    return apiRequest<{ checkIns: CheckIn[] }>(`/tracking/checkin?${queryString(params)}`).then(
      (data) => data.checkIns,
    );
  },

  saveWeight(input: { date: string; weightKg: number; photoUrl?: string }): Promise<WeightEntry> {
    return apiRequest<{ weightEntry: WeightEntry }>('/tracking/weight', {
      method: 'POST',
      body: input,
    }).then((data) => data.weightEntry);
  },

  listWeights(params: { from: string; to: string }): Promise<WeightEntry[]> {
    return apiRequest<{ weightEntries: WeightEntry[] }>(`/tracking/weight?${queryString(params)}`).then(
      (data) => data.weightEntries,
    );
  },
};
