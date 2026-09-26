import type { ScheduleEntry, TrackingAssignment } from '@/lib/api';

/**
 * A plan holds a rotating cycle of days (`content.days`), and the backend says
 * which day a date lands on. These parse what it sends — defensively, because
 * `content` is an open Json record on the wire.
 */
export type WorkoutPlanExercise = {
  id: string;
  name: string;
  note: string;
  sets: number;
  reps?: string;
  rest?: string;
};

export type DietPlanMeal = {
  id: string;
  label: string;
};

/** One day of a workout cycle. A rest day carries no exercises. */
export type WorkoutDayContent = {
  dayIndex: number;
  label: string;
  isRestDay: boolean;
  duration: string;
  exercises: WorkoutPlanExercise[];
};

export type DietDayContent = {
  dayIndex: number;
  label: string;
  calories: string;
  meals: DietPlanMeal[];
};

export type WorkoutPlanContent = {
  focus: string;
  summary: string;
  difficulty: string;
  days: WorkoutDayContent[];
};

export type DietPlanContent = {
  focus: string;
  summary: string;
  days: DietDayContent[];
};

/** One row the client checks off. The plan stores a set count; the screen needs one row per set. */
export type WorkoutSet = {
  /**
   * Doubles as the check-in item id (`{exerciseId}-set{n}`), which is what the
   * history calendar and the coach app count against.
   */
  id: string;
  setNumber: number;
  reps: string;
  rest: string;
};

export type WorkoutExercise = {
  id: string;
  name: string;
  note: string;
  sets: WorkoutSet[];
};

export type SetFeedback = {
  completed: boolean;
  comment: string;
  videoReference: string;
};

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function parseExercises(value: unknown): WorkoutPlanExercise[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(record)
    .filter((exercise): exercise is Record<string, unknown> => exercise !== null)
    .filter((exercise) => typeof exercise.id === 'string' && typeof exercise.sets === 'number')
    .map((exercise) => ({
      id: exercise.id as string,
      name: text(exercise.name),
      note: text(exercise.note),
      sets: Math.max(0, Math.floor(exercise.sets as number)),
      reps: text(exercise.reps) || undefined,
      rest: text(exercise.rest) || undefined,
    }));
}

function parseMeals(value: unknown): DietPlanMeal[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(record)
    .filter((meal): meal is Record<string, unknown> => meal !== null && typeof meal.id === 'string')
    .map((meal) => ({ id: meal.id as string, label: text(meal.label) }));
}

/** One workout day, as the schedule endpoint sends it. */
export function parseWorkoutDay(value: unknown): WorkoutDayContent | null {
  const day = record(value);
  if (!day) return null;
  const exercises = parseExercises(day.exercises);
  return {
    dayIndex: typeof day.dayIndex === 'number' ? day.dayIndex : 0,
    label: text(day.label),
    isRestDay: day.isRestDay === true,
    duration: text(day.duration),
    exercises,
  };
}

export function parseDietDay(value: unknown): DietDayContent | null {
  const day = record(value);
  if (!day) return null;
  return {
    dayIndex: typeof day.dayIndex === 'number' ? day.dayIndex : 0,
    label: text(day.label),
    calories: text(day.calories),
    meals: parseMeals(day.meals),
  };
}

export function parseWorkoutContent(content: unknown): WorkoutPlanContent | null {
  const data = record(content);
  if (!data || !Array.isArray(data.days)) return null;
  return {
    focus: text(data.focus),
    summary: text(data.summary),
    difficulty: text(data.difficulty),
    days: data.days.map(parseWorkoutDay).filter((day): day is WorkoutDayContent => day !== null),
  };
}

export function parseDietContent(content: unknown): DietPlanContent | null {
  const data = record(content);
  if (!data || !Array.isArray(data.days)) return null;
  return {
    focus: text(data.focus),
    summary: text(data.summary),
    days: data.days.map(parseDietDay).filter((day): day is DietDayContent => day !== null),
  };
}

/** Expands a day's set counts into checkable rows. */
export function workoutExercisesFrom(day: WorkoutDayContent): WorkoutExercise[] {
  return day.exercises.map((exercise) => ({
    id: exercise.id,
    name: exercise.name,
    note: exercise.note,
    sets: Array.from({ length: exercise.sets }, (_, index) => ({
      id: `${exercise.id}-set${index + 1}`,
      setNumber: index + 1,
      reps: exercise.reps ?? '—',
      rest: exercise.rest ?? '—',
    })),
  }));
}

export function workoutContentOf(assignment: TrackingAssignment | undefined): WorkoutPlanContent | null {
  return assignment ? parseWorkoutContent(assignment.content) : null;
}

export function dietContentOf(assignment: TrackingAssignment | undefined): DietPlanContent | null {
  return assignment ? parseDietContent(assignment.content) : null;
}

/** The workout day a schedule entry points at, if it is a workout entry. */
export function workoutDayOf(entry: ScheduleEntry | undefined): WorkoutDayContent | null {
  return entry && entry.type === 'WORKOUT' ? parseWorkoutDay(entry.content) : null;
}

export function dietDayOf(entry: ScheduleEntry | undefined): DietDayContent | null {
  return entry && entry.type === 'DIET' ? parseDietDay(entry.content) : null;
}

/** "Day 6 of 7"; null for a one-day plan, where it says nothing. */
export function cyclePositionLabel(entry: Pick<ScheduleEntry, 'dayIndex' | 'cycleLengthDays'>): string | null {
  return entry.cycleLengthDays > 1 ? `Day ${entry.dayIndex + 1} of ${entry.cycleLengthDays}` : null;
}

/**
 * "Day 3 · Pull", or just "Day 3" when the coach left the label blank. Shown so
 * a client understands the rotation rather than wondering why today differs.
 */
export function cycleDayLabel(entry: Pick<ScheduleEntry, 'dayIndex' | 'cycleLengthDays' | 'label'>): string {
  const day = `Day ${entry.dayIndex + 1}`;
  const ofCycle = entry.cycleLengthDays > 1 ? `${day} of ${entry.cycleLengthDays}` : day;
  return entry.label ? `${ofCycle} · ${entry.label}` : ofCycle;
}
