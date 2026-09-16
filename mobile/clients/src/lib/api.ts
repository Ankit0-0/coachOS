import { Platform } from 'react-native';

import { contextForRequest, messageForStatus } from '@/lib/api-errors';
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
  } catch (error) {
    console.log(`[api] ${method} ${path} failed before a response`, error);
    throw new ApiError(0, messageForStatus(0, contextForRequest(method, path)));
  }

  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    // Non-JSON response body — leave data null.
  }

  if (!response.ok) {
    // The status is for whoever is debugging; the person using the app gets
    // words chosen for this request (lib/api-errors.ts), never the number.
    console.log(`[api] ${method} ${path} failed with ${response.status}`, data);
    throw new ApiError(response.status, messageForStatus(response.status, contextForRequest(method, path)), data);
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
// Image uploads
// ---------------------------------------------------------------------------

/** Must match the backend allowlist in features/upload/schemas.ts. */
export type UploadContentType = 'image/jpeg' | 'image/png' | 'image/webp';

export type UploadPurpose = 'weight' | 'diet' | 'avatar';

export interface PresignedUpload {
  /** Valid for five minutes, and only for this one object and content type. */
  uploadUrl: string;
  /** What gets stored on the record. The API never returns raw keys on reads. */
  key: string;
}

export const uploadApi = {
  presign(input: { contentType: UploadContentType; purpose: UploadPurpose }): Promise<PresignedUpload> {
    // No key is sent: the server builds it under the caller's own id, so one
    // user can never aim an upload at another user's photo.
    return apiRequest<PresignedUpload>('/uploads/presign', { method: 'POST', body: input });
  },
};

// ---------------------------------------------------------------------------
// Tracking
// ---------------------------------------------------------------------------

export type PlanType = 'WORKOUT' | 'DIET';

export interface TrackingAssignment {
  id: string;
  planId: string;
  type: PlanType;
  title: string;
  /** Cycle-shaped: `{ focus, summary, days: [...] }`. Which day applies today comes from the schedule. */
  content: Record<string, unknown>;
  cycleLengthDays: number;
  /** The date the cycle counts from, YYYY-MM-DD. */
  startDate: string;
}

/**
 * What the client is scheduled to do on one date, for one plan. The backend
 * resolves the rotation — the app never works out which day of a cycle a date
 * lands on.
 */
export interface ScheduleEntry {
  date: string;
  assignmentId: string;
  planId: string;
  type: PlanType;
  title: string;
  /** 0-based, with the cycle length beside it, so a screen can say "Day 3 of 7". */
  dayIndex: number;
  cycleLengthDays: number;
  label: string;
  isRestDay: boolean;
  /** Sets for a workout day, meals for a diet day: the denominator for that date. */
  itemCount: number;
  itemIds: string[];
  /** That day of the plan, ready to render. Null if the plan has no such day. */
  content: Record<string, unknown> | null;
}

export interface CheckIn {
  id: string;
  assignmentId: string;
  date: string;
  completedItemIds: string[];
  notes: string | null;
  /**
   * { [itemId]: signedUrl }, one per plan item that has a photo. Signed on
   * every read and valid for about an hour — never store or cache these.
   */
  photoUrls: Record<string, string> | null;
}

export interface WeightEntry {
  id: string;
  clientId: string;
  date: string;
  weightKg: number;
  /** A freshly signed URL, not the stored key. Expires in about an hour. */
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
  /**
   * The coach's number, digits only with the country code. Present only on an
   * ACCEPTED invite, and null when the coach hasn't added one.
   */
  phone?: string | null;
  /** The coach's photo as a signed URL. Present only on an ACCEPTED invite; null without a photo. */
  avatarUrl?: string | null;
  /** The coach's profile, for the Your Coach page. Present only on an ACCEPTED invite. */
  bio?: string | null;
  specialties?: string[];
  yearsExperience?: number | null;
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
  /** A freshly signed URL, not the stored key. Null when there is no avatar. */
  avatarUrl: string | null;
  heightCm: number | null;
  /** Self-reported. Separate from WeightEntry, which is the tracked history. */
  weightKg: number | null;
  goals: string | null;
  /** Digits only with the country code, e.g. 919876543210. Empty or null when not added. */
  phone: string | null;
}

export interface ClientProfileUpdate {
  name?: string;
  heightCm?: number | null;
  weightKg?: number | null;
  goals?: string;
  /** Digits only with the country code (see lib/phone). An empty string removes it. */
  phone?: string;
  /** An S3 key from uploadApi.presign. Null removes the avatar. */
  avatarKey?: string | null;
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
    /**
     * Merged into the stored map per item, so send only what changed. Omit it
     * to leave photos alone; a null value removes that one item's photo.
     */
    photoKeys?: Record<string, string | null> | null;
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

  saveWeight(input: { date: string; weightKg: number; photoKey?: string | null }): Promise<WeightEntry> {
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

// ---------------------------------------------------------------------------
// Explore: coach directory and coaching requests
// ---------------------------------------------------------------------------

/**
 * Where you stand with a coach. The directory reports it, so the profile screen
 * shows the one action that fits and never has to decode a 409.
 */
export type ExploreRelationship = 'COACHING' | 'INVITED' | 'REQUESTED' | 'NONE';

/** A coach who opted in to Explore and is approved. Never includes contact details. */
export interface DirectoryCoach {
  id: string;
  name: string;
  bio: string | null;
  specialties: string[];
  yearsExperience: number | null;
  /** A freshly signed URL, not the stored key. Null when there is no avatar. */
  avatarUrl: string | null;
  /** Clients whose relationship is still running: a current subscription, or none (open-ended). */
  activeClientCount: number;
  /** Every client the coach has ever accepted. */
  totalClientCount: number;
  relationship: ExploreRelationship;
  /** Set when `relationship` is REQUESTED, so the request can be cancelled. */
  pendingRequestId: string | null;
}

export interface CoachRequest {
  id: string;
  coachId: string;
  clientId: string;
  coach?: { id: string; name: string };
  message: string | null;
  status: InviteStatus;
  createdAt: string;
  respondedAt: string | null;
}

export const exploreApi = {
  listCoaches(): Promise<DirectoryCoach[]> {
    return apiRequest<{ coaches: DirectoryCoach[] }>('/client/coaches').then((data) => data.coaches);
  },

  getCoach(coachId: string): Promise<DirectoryCoach> {
    return apiRequest<{ coach: DirectoryCoach }>(`/client/coaches/${encodeURIComponent(coachId)}`).then(
      (data) => data.coach,
    );
  },
};

export const coachRequestApi = {
  create(input: { coachId: string; message?: string }): Promise<CoachRequest> {
    return apiRequest<{ request: CoachRequest }>('/client/coach-requests', {
      method: 'POST',
      body: input,
    }).then((data) => data.request);
  },

  list(status?: InviteStatus): Promise<CoachRequest[]> {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    return apiRequest<{ requests: CoachRequest[] }>(`/client/coach-requests${query}`).then(
      (data) => data.requests,
    );
  },

  cancel(requestId: string): Promise<CoachRequest> {
    return apiRequest<{ request: CoachRequest }>(
      `/client/coach-requests/${encodeURIComponent(requestId)}/cancel`,
      { method: 'POST' },
    ).then((data) => data.request);
  },
};

// ---------------------------------------------------------------------------
// Subscription
// ---------------------------------------------------------------------------

export type SubscriptionStatus = 'ACTIVE' | 'EXPIRED' | 'CANCELLED';

export interface ClientSubscription {
  id: string;
  coachId: string;
  clientId: string;
  startDate: string;
  endDate: string;
  status: SubscriptionStatus;
  storedStatus: SubscriptionStatus;
  daysRemaining: number;
  notes: string | null;
  coach: { id: string; name: string; email: string };
}

export const scheduleApi = {
  /** Every active plan's day for each date in the range, inclusive. */
  list(params: { from: string; to: string }): Promise<ScheduleEntry[]> {
    return apiRequest<{ schedule: ScheduleEntry[] }>(`/client/schedule?${queryString(params)}`).then(
      (data) => data.schedule,
    );
  },
};

export const clientSubscriptionApi = {
  /** Null when the relationship is open-ended — a normal state, not an error. */
  get(): Promise<ClientSubscription | null> {
    return apiRequest<{ subscription: ClientSubscription | null }>('/client/subscription').then(
      (data) => data.subscription,
    );
  },
};
