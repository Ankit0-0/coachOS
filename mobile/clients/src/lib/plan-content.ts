import type { TrackingAssignment } from '@/lib/api';

/**
 * The shapes a coach's plan is stored in (`Plan.content`), mirroring the
 * backend's workoutContentSchema / dietContentSchema. The API types `content`
 * as an open record, so these are parsed defensively rather than cast.
 */
export type WorkoutPlanExercise = {
  id: string;
  name: string;
  note: string;
  sets: number;
  reps?: string;
  rest?: string;
};

export type WorkoutPlanContent = {
  duration: string;
  focus: string;
  summary: string;
  difficulty: string;
  exercises: WorkoutPlanExercise[];
};

export type DietPlanMeal = {
  id: string;
  label: string;
};

export type DietPlanContent = {
  calories: string;
  focus: string;
  summary: string;
  meals: DietPlanMeal[];
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

export function parseWorkoutContent(content: unknown): WorkoutPlanContent | null {
  const data = record(content);
  if (!data || !Array.isArray(data.exercises)) return null;

  const exercises = data.exercises
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

  return {
    duration: text(data.duration),
    focus: text(data.focus),
    summary: text(data.summary),
    difficulty: text(data.difficulty),
    exercises,
  };
}

export function parseDietContent(content: unknown): DietPlanContent | null {
  const data = record(content);
  if (!data || !Array.isArray(data.meals)) return null;

  const meals = data.meals
    .map(record)
    .filter((meal): meal is Record<string, unknown> => meal !== null && typeof meal.id === 'string')
    .map((meal) => ({ id: meal.id as string, label: text(meal.label) }));

  return {
    calories: text(data.calories),
    focus: text(data.focus),
    summary: text(data.summary),
    meals,
  };
}

/** Expands each exercise's set count into checkable rows. */
export function workoutExercisesFrom(content: WorkoutPlanContent): WorkoutExercise[] {
  return content.exercises.map((exercise) => ({
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
