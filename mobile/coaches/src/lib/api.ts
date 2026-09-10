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

// ---------------------------------------------------------------------------
// Coach profile
// ---------------------------------------------------------------------------

export interface CoachProfile {
  id: string;
  name: string;
  email: string;
  role: Role;
  memberSince: string;
  bio: string | null;
  specialties: string[];
  yearsExperience: number | null;
  phone: string | null;
}

export interface CoachProfileUpdate {
  name?: string;
  bio?: string;
  specialties?: string[];
  yearsExperience?: number | null;
  phone?: string;
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
}

export interface WorkoutContent {
  duration: string;
  focus: string;
  summary: string;
  difficulty: string;
  exercises: ExerciseContent[];
}

export interface MealContent {
  id: string;
  label: string;
}

export interface DietContent {
  calories: string;
  focus: string;
  summary: string;
  meals: MealContent[];
}

export interface Plan {
  id: string;
  type: PlanType;
  title: string;
  description: string | null;
  content: WorkoutContent | DietContent;
  isDefault: boolean;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
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
    content: WorkoutContent | DietContent;
  }): Promise<Plan> {
    return apiRequest<{ plan: Plan }>('/coach/plans', { method: 'POST', body: input }).then(
      (data) => data.plan,
    );
  },

  update(
    id: string,
    input: { title?: string; description?: string; content?: WorkoutContent | DietContent },
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
  create(input: { clientId: string; planId: string }): Promise<PlanAssignment> {
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
  createdAt: string;
}

export interface WeightEntry {
  id: string;
  clientId: string;
  date: string;
  weightKg: number;
  photoUrl: string | null;
  createdAt: string;
}

export interface ClientProfile {
  name: string;
  email: string;
  heightCm: number | null;
  weightKg: number | null;
  goals: string | null;
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
};
