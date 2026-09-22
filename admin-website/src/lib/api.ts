/**
 * Thin client over the same /v1 API both mobile apps use.
 *
 * Error responses carry no body by design — the status code is the whole
 * message — so `ApiError` keeps the status and the callers map it to wording.
 */

export const API_BASE_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:4000/v1').replace(/\/+$/, '');

const TOKEN_KEY = 'coachos.admin.access_token';

export function loadToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function saveToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // A browser with storage blocked still works for the current tab.
  }
}

export function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Nothing to do; the in-memory session is dropped by the caller anyway.
  }
}

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  auth?: boolean;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true } = options;

  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth) {
    const token = loadToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'Could not reach the server. Check that the backend is running.');
  }

  if (response.status === 204) return undefined as T;

  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    // Bare status responses have no body; that is expected.
  }

  if (!response.ok) {
    throw new ApiError(response.status, `Request failed with status ${response.status}.`);
  }

  return data as T;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Role = 'COACH' | 'CLIENT' | 'ADMIN';
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type PlanType = 'WORKOUT' | 'DIET';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface CoachSummary {
  id: string;
  name: string;
  email: string;
  memberSince: string;
  approvalStatus: ApprovalStatus | null;
  clientCount: number;
}

export interface CoachClient {
  inviteId: string;
  id: string | null;
  name: string | null;
  email: string;
  since: string | null;
}

export interface CoachDetail extends CoachSummary {
  bio: string | null;
  specialties: string[];
  yearsExperience: number | null;
  phone: string | null;
  clients: CoachClient[];
}

export interface Exercise {
  id: string;
  name: string;
  note: string;
  sets: number;
  reps?: string;
  rest?: string;
}

/** One day of a plan's rotating cycle. Which day a date lands on is the backend's to work out. */
export interface WorkoutDay {
  dayIndex: number;
  label: string;
  isRestDay: boolean;
  duration: string;
  exercises: Exercise[];
}

export interface WorkoutContent {
  focus: string;
  summary: string;
  difficulty: string;
  days: WorkoutDay[];
}

export interface Meal {
  id: string;
  label: string;
}

export interface DietDay {
  dayIndex: number;
  label: string;
  calories: string;
  meals: Meal[];
}

export interface DietContent {
  focus: string;
  summary: string;
  days: DietDay[];
}

export interface Plan {
  id: string;
  type: PlanType;
  title: string;
  description: string | null;
  content: WorkoutContent | DietContent;
  /** 1-31, always equal to `content.days.length`. */
  cycleLengthDays: number;
  isDefault: boolean;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

export const authApi = {
  login(email: string, password: string) {
    return request<{ user: AuthUser; accessToken: string }>('/auth/login', {
      method: 'POST',
      body: { email, password },
      auth: false,
    });
  },

  me() {
    return request<{ user: AuthUser }>('/me').then((data) => data.user);
  },
};

export const adminCoachApi = {
  list(status?: ApprovalStatus) {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    return request<{ coaches: CoachSummary[] }>(`/admin/coaches${query}`).then((data) => data.coaches);
  },

  get(id: string) {
    return request<{ coach: CoachDetail }>(`/admin/coaches/${encodeURIComponent(id)}`).then((data) => data.coach);
  },

  approve(id: string) {
    return request<{ coach: CoachSummary }>(`/admin/coaches/${encodeURIComponent(id)}/approve`, { method: 'POST' });
  },

  reject(id: string) {
    return request<{ coach: CoachSummary }>(`/admin/coaches/${encodeURIComponent(id)}/reject`, { method: 'POST' });
  },
};

export type DevicePlatform = 'IOS' | 'ANDROID';

export interface EarlyAccessSignup {
  id: string;
  email: string;
  platform: DevicePlatform;
  createdAt: string;
}

export interface EarlyAccessList {
  signups: EarlyAccessSignup[];
  total: number;
  countsByPlatform: Record<DevicePlatform, number>;
}

export const adminEarlyAccessApi = {
  list() {
    return request<EarlyAccessList>('/admin/early-access');
  },
};

export const adminPlanApi = {
  list(type: PlanType) {
    return request<{ plans: Plan[] }>(`/admin/plans?type=${type}`).then((data) => data.plans);
  },

  create(input: {
    type: PlanType;
    title: string;
    description?: string;
    cycleLengthDays: number;
    content: WorkoutContent | DietContent;
  }) {
    return request<{ plan: Plan }>('/admin/plans', { method: 'POST', body: input }).then((data) => data.plan);
  },

  update(
    id: string,
    input: { title?: string; description?: string; cycleLengthDays?: number; content?: WorkoutContent | DietContent },
  ) {
    return request<{ plan: Plan }>(`/admin/plans/${encodeURIComponent(id)}`, { method: 'PATCH', body: input }).then(
      (data) => data.plan,
    );
  },

  remove(id: string) {
    return request<void>(`/admin/plans/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },
};
