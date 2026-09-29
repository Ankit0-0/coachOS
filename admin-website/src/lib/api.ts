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

// ---------------------------------------------------------------------------
// Exercise and diet-item library (global entries only)
// ---------------------------------------------------------------------------

export type MuscleGroup =
  | 'CHEST'
  | 'UPPER_BACK'
  | 'LATS'
  | 'TRAPS'
  | 'SHOULDERS'
  | 'BICEPS'
  | 'TRICEPS'
  | 'FOREARMS'
  | 'QUADS'
  | 'HAMSTRINGS'
  | 'GLUTES'
  | 'CALVES'
  | 'CORE'
  | 'OBLIQUES'
  | 'FULL_BODY'
  | 'CARDIO';

export type TrainingDay =
  | 'PUSH'
  | 'PULL'
  | 'LEGS'
  | 'CHEST'
  | 'BACK'
  | 'SHOULDERS'
  | 'ARMS'
  | 'CORE'
  | 'CARDIO'
  | 'FULL_BODY';

export type Equipment = 'BARBELL' | 'DUMBBELL' | 'MACHINE' | 'CABLE' | 'BODYWEIGHT' | 'KETTLEBELL' | 'BANDS' | 'OTHER';

export type MealType = 'BREAKFAST' | 'LUNCH' | 'SNACK' | 'DINNER' | 'PRE_WORKOUT' | 'POST_WORKOUT';

export interface LibraryExercise {
  id: string;
  name: string;
  primaryMuscles: MuscleGroup[];
  secondaryMuscles: MuscleGroup[];
  trainingDay: TrainingDay | null;
  equipment: Equipment | null;
  instructions: string | null;
  videoUrl: string | null;
  /** Signed and short-lived; null when there is no image or the bucket can't sign one. */
  imageUrl: string | null;
  /** Whether an image is stored at all, even where it can't be shown. */
  hasImage: boolean;
  isGlobal: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LibraryDietItem {
  id: string;
  name: string;
  mealType: MealType | null;
  calories: number | null;
  proteinG: number | null;
  notes: string | null;
  imageUrl: string | null;
  hasImage: boolean;
  isGlobal: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Page {
  total: number;
  page: number;
  pageSize: number;
}

export interface ExerciseInput {
  name: string;
  primaryMuscles: MuscleGroup[];
  secondaryMuscles: MuscleGroup[];
  trainingDay: TrainingDay | null;
  equipment: Equipment | null;
  instructions: string | null;
  videoUrl: string | null;
  /** Omitted leaves the image alone; null removes it; a key from `uploadImage` replaces it. */
  imageKey?: string | null;
}

export interface DietItemInput {
  name: string;
  mealType: MealType | null;
  calories: number | null;
  proteinG: number | null;
  notes: string | null;
  imageKey?: string | null;
}

/** Blank filters are left out of the query rather than sent empty. */
function queryString(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : '';
}

export const adminExerciseApi = {
  list(filters: { q?: string; muscleGroup?: MuscleGroup | ''; trainingDay?: TrainingDay | ''; page: number }) {
    return request<{ exercises: LibraryExercise[] } & Page>(`/admin/exercises${queryString(filters)}`);
  },

  create(input: ExerciseInput) {
    return request<{ exercise: LibraryExercise }>('/admin/exercises', { method: 'POST', body: input }).then(
      (data) => data.exercise,
    );
  },

  update(id: string, input: ExerciseInput) {
    return request<{ exercise: LibraryExercise }>(`/admin/exercises/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: input,
    }).then((data) => data.exercise);
  },

  remove(id: string) {
    return request<void>(`/admin/exercises/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },
};

export const adminDietItemApi = {
  list(filters: { q?: string; mealType?: MealType | ''; page: number }) {
    return request<{ dietItems: LibraryDietItem[] } & Page>(`/admin/diet-items${queryString(filters)}`);
  },

  create(input: DietItemInput) {
    return request<{ dietItem: LibraryDietItem }>('/admin/diet-items', { method: 'POST', body: input }).then(
      (data) => data.dietItem,
    );
  },

  update(id: string, input: DietItemInput) {
    return request<{ dietItem: LibraryDietItem }>(`/admin/diet-items/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: input,
    }).then((data) => data.dietItem);
  },

  remove(id: string) {
    return request<void>(`/admin/diet-items/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },
};

// ---------------------------------------------------------------------------
// Image uploads — the same presign → PUT → store-the-key flow the apps use
// ---------------------------------------------------------------------------

/** Must match the backend allowlist in features/upload/schemas.ts. */
export const UPLOAD_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type UploadContentType = (typeof UPLOAD_CONTENT_TYPES)[number];
export type UploadPurpose = 'exercise' | 'diet-item';

/** The apps cap uploads at this too; a presigned PUT can't enforce a size itself. */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export function isUploadContentType(type: string): type is UploadContentType {
  return (UPLOAD_CONTENT_TYPES as readonly string[]).includes(type);
}

/** Uploads straight to S3 and returns the key to save on the entry. */
export async function uploadImage(file: File, purpose: UploadPurpose): Promise<string> {
  if (!isUploadContentType(file.type)) {
    throw new ApiError(400, 'Choose a JPEG, PNG or WebP image.');
  }
  const { uploadUrl, key } = await request<{ uploadUrl: string; key: string }>('/uploads/presign', {
    method: 'POST',
    body: { contentType: file.type, purpose },
  });

  let response: Response;
  try {
    // Content-Type is part of what was signed, so it has to match exactly.
    response = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
  } catch {
    throw new ApiError(0, 'Could not reach image storage.');
  }
  if (!response.ok) throw new ApiError(response.status, 'The image upload was rejected.');
  return key;
}
