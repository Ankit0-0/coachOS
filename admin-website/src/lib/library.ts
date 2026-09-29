import { ApiError, type Equipment, type MealType, type MuscleGroup, type TrainingDay } from './api';

/** Display order and wording for the library's fixed lists. The values are the backend's enums. */

export const MUSCLE_GROUPS: { value: MuscleGroup; label: string }[] = [
  { value: 'CHEST', label: 'Chest' },
  { value: 'UPPER_BACK', label: 'Upper back' },
  { value: 'LATS', label: 'Lats' },
  { value: 'TRAPS', label: 'Traps' },
  { value: 'SHOULDERS', label: 'Shoulders' },
  { value: 'BICEPS', label: 'Biceps' },
  { value: 'TRICEPS', label: 'Triceps' },
  { value: 'FOREARMS', label: 'Forearms' },
  { value: 'QUADS', label: 'Quads' },
  { value: 'HAMSTRINGS', label: 'Hamstrings' },
  { value: 'GLUTES', label: 'Glutes' },
  { value: 'CALVES', label: 'Calves' },
  { value: 'CORE', label: 'Core' },
  { value: 'OBLIQUES', label: 'Obliques' },
  { value: 'FULL_BODY', label: 'Full body' },
  { value: 'CARDIO', label: 'Cardio' },
];

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

export const EQUIPMENT: { value: Equipment; label: string }[] = [
  { value: 'BARBELL', label: 'Barbell' },
  { value: 'DUMBBELL', label: 'Dumbbell' },
  { value: 'MACHINE', label: 'Machine' },
  { value: 'CABLE', label: 'Cable' },
  { value: 'BODYWEIGHT', label: 'Bodyweight' },
  { value: 'KETTLEBELL', label: 'Kettlebell' },
  { value: 'BANDS', label: 'Bands' },
  { value: 'OTHER', label: 'Other' },
];

export const MEAL_TYPES: { value: MealType; label: string }[] = [
  { value: 'BREAKFAST', label: 'Breakfast' },
  { value: 'LUNCH', label: 'Lunch' },
  { value: 'SNACK', label: 'Snack' },
  { value: 'DINNER', label: 'Dinner' },
  { value: 'PRE_WORKOUT', label: 'Pre-workout' },
  { value: 'POST_WORKOUT', label: 'Post-workout' },
];

function labelFrom<T extends string>(options: { value: T; label: string }[]) {
  const labels = new Map(options.map((option) => [option.value, option.label]));
  return (value: T | null | undefined): string => (value ? (labels.get(value) ?? value) : '—');
}

export const muscleLabel = labelFrom(MUSCLE_GROUPS);
export const trainingDayLabel = labelFrom(TRAINING_DAYS);
export const equipmentLabel = labelFrom(EQUIPMENT);
export const mealTypeLabel = labelFrom(MEAL_TYPES);

/** Whether the browser will accept this as a link; the backend checks it again. */
export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/** Words for a failed save. Error responses carry no body, so the status is all there is to go on. */
export function librarySaveError(caught: unknown, noun: string): string {
  const fallback = `Could not save this ${noun}. Please try again.`;
  if (!(caught instanceof ApiError)) return fallback;
  switch (caught.status) {
    case 409:
      return `Another ${noun} already has this name.`;
    case 400:
      // uploadImage raises its own 400 with wording meant for the person.
      return caught.message.startsWith('Choose') ? caught.message : 'Some fields are not valid. Check them and try again.';
    case 403:
      return 'The image could not be attached. Choose it again.';
    case 503:
      return 'Image uploads are not set up on the server yet. Save without an image for now.';
    case 0:
      return caught.message;
    default:
      return fallback;
  }
}
