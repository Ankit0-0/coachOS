/**
 * A plan holds a rotating cycle of days. `content.days[dayIndex]` is what the
 * client does on a given date; which index that is for a date is worked out in
 * schedule.ts, never by an app.
 *
 * Plans written before cycles existed hold a single day's exercises or meals at
 * the top level. Every read path goes through `normalizePlanContent`, which
 * turns that into a one-day cycle, so the old shape keeps working whether or
 * not the backfill script has run. Item ids are never rewritten here: CheckIn
 * rows reference them.
 */

export const MIN_CYCLE_LENGTH_DAYS = 1;
export const MAX_CYCLE_LENGTH_DAYS = 31;

export type Exercise = {
  id: string;
  name: string;
  note: string;
  sets: number;
  reps?: string;
  rest?: string;
};

export type Meal = {
  id: string;
  label: string;
};

export type WorkoutDay = {
  dayIndex: number;
  label: string;
  isRestDay: boolean;
  /** Free text, as coaches write "45 min" or "1 hr" as readily as a number. */
  duration: string;
  exercises: Exercise[];
};

export type DietDay = {
  dayIndex: number;
  label: string;
  /** Free text for the same reason as duration: "1,950 kcal", "about 2000". */
  calories: string;
  meals: Meal[];
};

export type WorkoutContent = {
  focus: string;
  summary: string;
  difficulty: string;
  days: WorkoutDay[];
};

export type DietContent = {
  focus: string;
  summary: string;
  days: DietDay[];
};

export type PlanContent = WorkoutContent | DietContent;

/** One day of either kind, for code that treats both alike (counting, scheduling). */
export type PlanDay = {
  dayIndex: number;
  label: string;
  isRestDay: boolean;
  /** Exercises for a workout day, meals for a diet day. */
  itemCount: number;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function isCycleShape(content: Record<string, unknown>): boolean {
  return Array.isArray(content.days);
}

function normalizeExercise(value: unknown, index: number): Exercise | null {
  const row = asRecord(value);
  if (!row) return null;
  const reps = text(row.reps);
  const rest = text(row.rest);
  return {
    id: text(row.id) || `exercise-${index + 1}`,
    name: text(row.name),
    note: text(row.note),
    sets: typeof row.sets === "number" && Number.isFinite(row.sets) ? Math.max(0, Math.floor(row.sets)) : 1,
    ...(reps ? { reps } : {}),
    ...(rest ? { rest } : {}),
  };
}

function normalizeMeal(value: unknown, index: number): Meal | null {
  const row = asRecord(value);
  if (!row) return null;
  return { id: text(row.id) || `meal-${index + 1}`, label: text(row.label) };
}

function normalizeWorkoutDay(value: unknown, index: number): WorkoutDay {
  const row = asRecord(value) ?? {};
  const exercises = Array.isArray(row.exercises)
    ? row.exercises.map(normalizeExercise).filter((exercise): exercise is Exercise => exercise !== null)
    : [];
  const isRestDay = row.isRestDay === true || (row.isRestDay !== false && exercises.length === 0);
  return {
    dayIndex: typeof row.dayIndex === "number" ? row.dayIndex : index,
    label: text(row.label) || (isRestDay ? "Rest" : `Day ${index + 1}`),
    isRestDay,
    duration: text(row.duration),
    exercises: isRestDay ? [] : exercises,
  };
}

function normalizeDietDay(value: unknown, index: number): DietDay {
  const row = asRecord(value) ?? {};
  const meals = Array.isArray(row.meals)
    ? row.meals.map(normalizeMeal).filter((meal): meal is Meal => meal !== null)
    : [];
  return {
    dayIndex: typeof row.dayIndex === "number" ? row.dayIndex : index,
    label: text(row.label) || `Day ${index + 1}`,
    calories: text(row.calories),
    meals,
  };
}

/**
 * The stored content in its current shape, whatever shape it is stored in.
 * Legacy single-day content becomes day 0 of a one-day cycle with its items
 * untouched.
 */
export function normalizePlanContent(type: "WORKOUT" | "DIET", content: unknown): PlanContent {
  const raw = asRecord(content) ?? {};
  const focus = text(raw.focus);
  const summary = text(raw.summary);

  if (type === "WORKOUT") {
    const days = isCycleShape(raw)
      ? (raw.days as unknown[]).map(normalizeWorkoutDay)
      : [normalizeWorkoutDay({ ...raw, dayIndex: 0, label: text(raw.label), isRestDay: false }, 0)];
    return { focus, summary, difficulty: text(raw.difficulty), days: days.map((day, index) => ({ ...day, dayIndex: index })) };
  }

  const days = isCycleShape(raw)
    ? (raw.days as unknown[]).map(normalizeDietDay)
    : [normalizeDietDay({ ...raw, dayIndex: 0, label: text(raw.label) }, 0)];
  return { focus, summary, days: days.map((day, index) => ({ ...day, dayIndex: index })) };
}

export function isWorkoutContent(content: PlanContent): content is WorkoutContent {
  return "difficulty" in content;
}

/** The days of either kind, flattened to what scheduling and counting need. */
export function planDays(type: "WORKOUT" | "DIET", content: unknown): PlanDay[] {
  const normalized = normalizePlanContent(type, content);
  if (isWorkoutContent(normalized)) {
    return normalized.days.map((day) => ({
      dayIndex: day.dayIndex,
      label: day.label,
      isRestDay: day.isRestDay,
      itemCount: day.exercises.reduce((total, exercise) => total + Math.max(1, exercise.sets), 0),
    }));
  }
  return normalized.days.map((day) => ({
    dayIndex: day.dayIndex,
    label: day.label,
    isRestDay: false,
    itemCount: day.meals.length,
  }));
}

/**
 * The ids a client can tick off on a given day: one per set for a workout
 * (`{exerciseId}-set{n}`, as the check-in screens have always built them), one
 * per meal for a diet.
 */
export function dayItemIds(type: "WORKOUT" | "DIET", content: unknown, dayIndex: number): string[] {
  const normalized = normalizePlanContent(type, content);
  if (isWorkoutContent(normalized)) {
    const day = normalized.days[dayIndex];
    if (!day || day.isRestDay) return [];
    return day.exercises.flatMap((exercise) =>
      Array.from({ length: Math.max(1, exercise.sets) }, (_, index) => `${exercise.id}-set${index + 1}`),
    );
  }
  const day = normalized.days[dayIndex];
  return day ? day.meals.map((meal) => meal.id) : [];
}

/**
 * Item ids carry their day (`d0-bench`), so the same exercise on several days
 * stays distinct in a check-in. Applied when a day is duplicated or created;
 * ids that already carry a day prefix are re-pointed rather than stacked.
 */
export function prefixItemId(id: string, dayIndex: number): string {
  const withoutPrefix = id.replace(/^d\d+-/, "");
  return `d${dayIndex}-${withoutPrefix}`;
}
