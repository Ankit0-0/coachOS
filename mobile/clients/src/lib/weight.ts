/**
 * The heaviest weight the API accepts, mirrored from the backend
 * (backend/src/utils/weight.ts) so an out-of-range entry is caught with a
 * message that says why, before the request goes anywhere.
 */
export const MAX_WEIGHT_KG = 150;

export type ParsedWeight = { status: 'valid'; kg: number } | { status: 'invalid'; message: string };

/** Reads a typed weight in kg: a number above 0 and no more than MAX_WEIGHT_KG. */
export function parseWeightInput(raw: string): ParsedWeight {
  const trimmed = raw.trim().replace(',', '.');
  // Number() rather than parseFloat, so "75kg" or "7 5" is refused instead of half-read.
  const kg = trimmed === '' ? Number.NaN : Number(trimmed);
  if (!Number.isFinite(kg)) return { status: 'invalid', message: 'Enter your weight in kg as a number, like 75.5.' };
  if (kg <= 0) return { status: 'invalid', message: 'Weight has to be more than 0 kg.' };
  if (kg > MAX_WEIGHT_KG) return { status: 'invalid', message: `Weight can’t be more than ${MAX_WEIGHT_KG} kg.` };
  return { status: 'valid', kg };
}
