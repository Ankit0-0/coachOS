import type { ExerciseHistory, SetLog } from '@/lib/api';

/** The same ceilings the API enforces. */
const MAX_LIFT_KG = 1000;
const MAX_REPS = 1000;

/** "62.5" or "62,5" (a comma keyboard) → 62.5; blank → null; anything else → undefined (invalid). */
function parseNumber(text: string, max: number, integer: boolean): number | null | undefined {
  const trimmed = text.trim().replace(',', '.');
  if (trimmed === '') return null;
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return undefined;
  const value = Number(trimmed);
  if (value > max || (integer && !Number.isInteger(value))) return undefined;
  return value;
}

/**
 * The typed weight and reps as a log to save. `null` means nothing to save
 * (both blank); `undefined` means something typed isn't a valid number.
 */
export function parseSetLog(weightText: string, repsText: string): SetLog | null | undefined {
  const weightKg = parseNumber(weightText, MAX_LIFT_KG, false);
  const reps = parseNumber(repsText, MAX_REPS, true);
  if (weightKg === undefined || reps === undefined) return undefined;
  return weightKg === null && reps === null ? null : { weightKg, reps };
}

/** A saved log back into the text fields. */
export function setLogText(log: SetLog | undefined): { weightKg: string; reps: string } {
  return { weightKg: log?.weightKg != null ? String(log.weightKg) : '', reps: log?.reps != null ? String(log.reps) : '' };
}

/** "62.5 kg × 6", "× 12" (bodyweight), "40 kg", or '' with nothing logged. */
export function formatSetLog(log: SetLog | null | undefined): string {
  if (!log) return '';
  if (log.weightKg !== null && log.reps !== null) return `${log.weightKg} kg × ${log.reps}`;
  if (log.weightKg !== null) return `${log.weightKg} kg`;
  return log.reps !== null ? `× ${log.reps}` : '';
}

/**
 * What was lifted on this exercise the last time before `today`, set by set —
 * the hint that tells a client what to beat. Matched by name, as the API
 * groups history; null when there is no earlier session.
 */
export function lastSessionFor(
  history: readonly ExerciseHistory[],
  exerciseName: string,
  today: string,
): { date: string; sets: SetLog[] } | null {
  const key = exerciseName.trim().toLowerCase();
  const exercise = history.find((entry) => entry.name.trim().toLowerCase() === key);
  const earlier = exercise?.sessions.filter((session) => session.date < today) ?? [];
  const last = earlier[earlier.length - 1];
  return last ? { date: last.date, sets: last.sets } : null;
}
