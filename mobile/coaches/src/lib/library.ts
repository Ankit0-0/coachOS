import type { MealType, MuscleGroup, TrainingDay } from '@/lib/api';

/** Display order and wording for the library's fixed lists, as in the admin site. */

export const TRAINING_DAYS: { value: TrainingDay; label: string }[] = [
  { value: 'PUSH', label: 'Push' },
  { value: 'PULL', label: 'Pull' },
  { value: 'LEGS', label: 'Legs' },
  { value: 'CHEST', label: 'Chest' },
  { value: 'BACK', label: 'Back' },
  { value: 'SHOULDERS', label: 'Shoulders' },
  { value: 'ARMS', label: 'Arms' },
  { value: 'CORE', label: 'Core' },
  { value: 'CARDIO', label: 'Cardio' },
  { value: 'FULL_BODY', label: 'Full body' },
];

export const MEAL_TYPES: { value: MealType; label: string }[] = [
  { value: 'BREAKFAST', label: 'Breakfast' },
  { value: 'LUNCH', label: 'Lunch' },
  { value: 'SNACK', label: 'Snack' },
  { value: 'DINNER', label: 'Dinner' },
  { value: 'PRE_WORKOUT', label: 'Pre-workout' },
  { value: 'POST_WORKOUT', label: 'Post-workout' },
];

const MUSCLE_LABELS: Record<MuscleGroup, string> = {
  CHEST: 'Chest',
  UPPER_BACK: 'Upper back',
  LATS: 'Lats',
  TRAPS: 'Traps',
  SHOULDERS: 'Shoulders',
  BICEPS: 'Biceps',
  TRICEPS: 'Triceps',
  FOREARMS: 'Forearms',
  QUADS: 'Quads',
  HAMSTRINGS: 'Hamstrings',
  GLUTES: 'Glutes',
  CALVES: 'Calves',
  CORE: 'Core',
  OBLIQUES: 'Obliques',
  FULL_BODY: 'Full body',
  CARDIO: 'Cardio',
};

export function muscleLabel(muscle: MuscleGroup): string {
  return MUSCLE_LABELS[muscle] ?? muscle;
}

export type LibraryGroup<T, K extends string> = {
  /** Null holds entries with no group set. */
  key: K | null;
  items: T[];
};

/**
 * Splits ranked results into groups. While searching, a group sits where its
 * best match ranked, so the closest name stays near the top; with nothing
 * typed, groups follow `order`. Entries with no group come last either way.
 */
export function groupResults<T, K extends string>(
  items: T[],
  groupOf: (item: T) => K | null,
  order: K[],
  isSearching: boolean,
): LibraryGroup<T, K>[] {
  const groups = new Map<K | null, T[]>();
  for (const item of items) {
    const key = groupOf(item);
    const group = groups.get(key);
    if (group) group.push(item);
    else groups.set(key, [item]);
  }

  const entries = [...groups.entries()].map(([key, groupItems]) => ({ key, items: groupItems }));
  if (isSearching) {
    return entries.sort((a, b) => Number(a.key === null) - Number(b.key === null));
  }
  const position = (key: K | null) => (key === null ? order.length : order.indexOf(key));
  return entries.sort((a, b) => position(a.key) - position(b.key));
}

/** Whether the library already has exactly this name, ignoring case and outer spaces. */
export function hasExactName(items: { name: string }[], typed: string): boolean {
  const wanted = typed.trim().toLowerCase();
  return wanted.length > 0 && items.some((item) => item.name.trim().toLowerCase() === wanted);
}
