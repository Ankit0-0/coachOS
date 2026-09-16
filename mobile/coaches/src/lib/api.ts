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
      body: { ...input, role: 'COACH' as Role },
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
  /** The client's photo as a signed URL. Only on an ACCEPTED invite; null when they have none. */
  avatarUrl?: string | null;
}

export interface CoachInvite {
  id: string;
  coachId: string;
  clientEmail: string;
  clientId: string | null;
  client?: InvitePerson;
  status: InviteStatus;
  durationMonths: number | null;
  /** Null when this client has no subscription record — an open-ended relationship. */
  subscriptionStatus: 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | null;
  subscriptionEndDate: string | null;
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

  create(clientEmail: string, durationMonths?: number): Promise<CoachInvite> {
    return apiRequest<{ invite: CoachInvite }>('/coach/invites', {
      method: 'POST',
      // Omitted entirely when not chosen, which the backend reads as an
      // open-ended relationship with no subscription record.
      body: { clientEmail, ...(durationMonths ? { durationMonths } : {}) },
    }).then((data) => data.invite);
  },
};

// ---------------------------------------------------------------------------
// Coaching requests (clients asking to join, from Explore)
// ---------------------------------------------------------------------------

export interface CoachingRequest {
  id: string;
  coachId: string;
  clientId: string;
  client?: InvitePerson;
  /** Optional note the client wrote when asking. */
  message: string | null;
  status: InviteStatus;
  createdAt: string;
  respondedAt: string | null;
}

export const coachingRequestApi = {
  list(status: InviteStatus = 'PENDING'): Promise<CoachingRequest[]> {
    return apiRequest<{ requests: CoachingRequest[] }>(
      `/coach/coach-requests?status=${encodeURIComponent(status)}`,
    ).then((data) => data.requests);
  },

  /** Forms the coach–client relationship, exactly as an accepted invite would. */
  accept(requestId: string): Promise<CoachingRequest> {
    return apiRequest<{ request: CoachingRequest }>(
      `/coach/coach-requests/${encodeURIComponent(requestId)}/accept`,
      { method: 'POST' },
    ).then((data) => data.request);
  },

  decline(requestId: string): Promise<CoachingRequest> {
    return apiRequest<{ request: CoachingRequest }>(
      `/coach/coach-requests/${encodeURIComponent(requestId)}/decline`,
      { method: 'POST' },
    ).then((data) => data.request);
  },
};

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
// Coach profile
// ---------------------------------------------------------------------------

export type CoachApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface CoachProfile {
  id: string;
  name: string;
  email: string;
  role: Role;
  memberSince: string;
  /** Null only on accounts that predate the approval workflow. */
  approvalStatus: CoachApprovalStatus | null;
  /** A freshly signed URL, not the stored key. Null when there is no avatar. */
  avatarUrl: string | null;
  bio: string | null;
  specialties: string[];
  yearsExperience: number | null;
  phone: string | null;
  /** Whether clients can find this coach in Explore. Off until the coach opts in. */
  listedInExplore: boolean;
}

export interface CoachProfileUpdate {
  name?: string;
  bio?: string;
  specialties?: string[];
  yearsExperience?: number | null;
  /** Digits only with the country code (see lib/phone). An empty string removes it. */
  phone?: string;
  /** An S3 key from uploadApi.presign. Null removes the avatar. */
  avatarKey?: string | null;
  listedInExplore?: boolean;
}

export const coachProfileApi = {
  get(): Promise<CoachProfile> {
    return apiRequest<{ profile: CoachProfile }>('/coach/profile').then((data) => data.profile);
  },

  update(input: CoachProfileUpdate): Promise<CoachProfile> {
    return apiRequest<{ profile: CoachProfile }>('/coach/profile', {
      method: 'PATCH',
      body: input,
    }).then((data) => data.profile);
  },
};

// ---------------------------------------------------------------------------
// Plans & assignments
// ---------------------------------------------------------------------------

export type PlanType = 'WORKOUT' | 'DIET';

export interface ExerciseContent {
  id: string;
  name: string;
  note: string;
  sets: number;
  /** Free text, e.g. "8-10" or "AMRAP". Absent on plans written before these fields existed. */
  reps?: string;
  /** Free text, e.g. "90s". Absent on older plans. */
  rest?: string;
}

/**
 * One day of a plan's rotating cycle. `content.days[dayIndex]` is what a client
 * does on a date; which index a date maps to is the backend's to work out
 * (`/coach/clients/:id/schedule`), never this app's.
 */
export interface WorkoutDayContent {
  dayIndex: number;
  label: string;
  isRestDay: boolean;
  duration: string;
  exercises: ExerciseContent[];
}

export interface WorkoutContent {
  focus: string;
  summary: string;
  difficulty: string;
  days: WorkoutDayContent[];
}

export interface MealContent {
  id: string;
  label: string;
}

export interface DietDayContent {
  dayIndex: number;
  label: string;
  calories: string;
  meals: MealContent[];
}

export interface DietContent {
  focus: string;
  summary: string;
  days: DietDayContent[];
}

export interface Plan {
  id: string;
  type: PlanType;
  title: string;
  description: string | null;
  content: WorkoutContent | DietContent;
  /** How many days the cycle rotates through, 1-31. Always matches `content.days.length`. */
  cycleLengthDays: number;
  isDefault: boolean;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
  /**
   * Clients on this plan right now. Only sent for the coach's own plans, and
   * only where the backend counted it — absent means "not asked", not "none".
   */
  activeAssignmentCount?: number;
}

export type AssignmentStatus = 'ACTIVE' | 'COMPLETED' | 'PAUSED';

export interface PlanAssignment {
  id: string;
  planId: string;
  plan: Plan;
  coachId: string;
  clientId: string;
  status: AssignmentStatus;
  assignedAt: string;
  startDate: string | null;
  endDate: string | null;
}

export const planApi = {
  list(type: PlanType): Promise<{ own: Plan[]; defaults: Plan[] }> {
    return apiRequest<{ own: Plan[]; defaults: Plan[] }>(`/coach/plans?type=${type}`);
  },

  get(id: string): Promise<Plan> {
    return apiRequest<{ plan: Plan }>(`/coach/plans/${id}`).then((data) => data.plan);
  },

  create(input: {
    type: PlanType;
    title: string;
    description?: string;
    cycleLengthDays: number;
    content: WorkoutContent | DietContent;
  }): Promise<Plan> {
    return apiRequest<{ plan: Plan }>('/coach/plans', { method: 'POST', body: input }).then(
      (data) => data.plan,
    );
  },

  update(
    id: string,
    input: {
      title?: string;
      description?: string;
      /** Required whenever `content` is sent: the two have to agree. */
      cycleLengthDays?: number;
      content?: WorkoutContent | DietContent;
    },
  ): Promise<Plan> {
    return apiRequest<{ plan: Plan }>(`/coach/plans/${id}`, { method: 'PATCH', body: input }).then(
      (data) => data.plan,
    );
  },

  remove(id: string): Promise<void> {
    return apiRequest<void>(`/coach/plans/${id}`, { method: 'DELETE' });
  },
};

export const assignmentApi = {
  create(input: { clientId: string; planId: string; startDate?: string }): Promise<PlanAssignment> {
    return apiRequest<{ assignment: PlanAssignment }>('/coach/assignments', {
      method: 'POST',
      body: input,
    }).then((data) => data.assignment);
  },

  listForClient(clientId: string): Promise<PlanAssignment[]> {
    return apiRequest<{ assignments: PlanAssignment[] }>(
      `/coach/assignments?clientId=${encodeURIComponent(clientId)}`,
    ).then((data) => data.assignments);
  },
};

// ---------------------------------------------------------------------------
// Coach-scoped reads of a client's own data
// ---------------------------------------------------------------------------

export interface CheckIn {
  id: string;
  assignmentId: string;
  date: string;
  completedItemIds: string[];
  notes: string | null;
  /**
   * { [itemId]: signedUrl } for the client's meal photos. Read-only here —
   * coaches never upload against a client's own records.
   */
  photoUrls: Record<string, string> | null;
  createdAt: string;
}

export interface WeightEntry {
  id: string;
  clientId: string;
  date: string;
  weightKg: number;
  /** A freshly signed URL, not the stored key. Expires in about an hour. */
  photoUrl: string | null;
  createdAt: string;
}

export interface ClientProfile {
  name: string;
  email: string;
  /** A freshly signed URL for the client's own avatar, or null. */
  avatarUrl: string | null;
  heightCm: number | null;
  weightKg: number | null;
  goals: string | null;
  /** Digits only with the country code. Empty or null when the client hasn't added one. */
  phone: string | null;
  onboardedAt: string | null;
}

function queryString(params: Record<string, string>): string {
  return Object.entries(params)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
}

export const coachClientApi = {
  /** Omit `assignmentId` to get every check-in in the range, across all assignments. */
  listCheckIns(
    clientId: string,
    params: { assignmentId?: string; from: string; to: string },
  ): Promise<CheckIn[]> {
    return apiRequest<{ checkIns: CheckIn[] }>(
      `/coach/clients/${encodeURIComponent(clientId)}/checkins?${queryString(params)}`,
    ).then((data) => data.checkIns);
  },

  listWeights(clientId: string, params: { from: string; to: string }): Promise<WeightEntry[]> {
    return apiRequest<{ weightEntries: WeightEntry[] }>(
      `/coach/clients/${encodeURIComponent(clientId)}/weight?${queryString(params)}`,
    ).then((data) => data.weightEntries);
  },

  getProfile(clientId: string): Promise<ClientProfile> {
    return apiRequest<{ profile: ClientProfile }>(
      `/coach/clients/${encodeURIComponent(clientId)}/profile`,
    ).then((data) => data.profile);
  },

  /** What the client is scheduled to do on each date in the range, one entry per active plan. */
  listSchedule(clientId: string, params: { from: string; to: string }): Promise<ScheduleEntry[]> {
    return apiRequest<{ schedule: ScheduleEntry[] }>(
      `/coach/clients/${encodeURIComponent(clientId)}/schedule?${queryString(params)}`,
    ).then((data) => data.schedule);
  },
};

/** One plan on one date, with the cycle already resolved by the backend. */
export interface ScheduleEntry {
  date: string;
  assignmentId: string;
  planId: string;
  type: PlanType;
  title: string;
  dayIndex: number;
  cycleLengthDays: number;
  label: string;
  isRestDay: boolean;
  itemCount: number;
  itemIds: string[];
  /** That day of the plan. Null only if the plan's content is unreadable. */
  content: WorkoutDayContent | DietDayContent | null;
}

// ---------------------------------------------------------------------------
// Subscriptions
// ---------------------------------------------------------------------------

export type SubscriptionStatus = 'ACTIVE' | 'EXPIRED' | 'CANCELLED';

export interface Subscription {
  id: string;
  coachId: string;
  clientId: string;
  startDate: string;
  endDate: string;
  /** Computed at read time, so a lapsed period reports EXPIRED on its own. */
  status: SubscriptionStatus;
  /** What the row literally stores, which can lag behind `status`. */
  storedStatus: SubscriptionStatus;
  daysRemaining: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export const subscriptionApi = {
  list(clientId: string): Promise<Subscription[]> {
    return apiRequest<{ subscriptions: Subscription[] }>(
      `/coach/clients/${encodeURIComponent(clientId)}/subscriptions`,
    ).then((data) => data.subscriptions);
  },

  create(
    clientId: string,
    input: { startDate: string; endDate: string; notes?: string },
  ): Promise<Subscription> {
    return apiRequest<{ subscription: Subscription }>(
      `/coach/clients/${encodeURIComponent(clientId)}/subscriptions`,
      { method: 'POST', body: input },
    ).then((data) => data.subscription);
  },

  update(
    clientId: string,
    subscriptionId: string,
    input: { startDate?: string; endDate?: string; status?: SubscriptionStatus; notes?: string },
  ): Promise<Subscription> {
    return apiRequest<{ subscription: Subscription }>(
      `/coach/clients/${encodeURIComponent(clientId)}/subscriptions/${encodeURIComponent(subscriptionId)}`,
      { method: 'PATCH', body: input },
    ).then((data) => data.subscription);
  },
};
