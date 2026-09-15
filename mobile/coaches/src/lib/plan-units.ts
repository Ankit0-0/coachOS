/**
 * A plan's calories and duration are free text the coach typed, so they arrive
 * as "1,950 kcal" or as a bare "2200". A bare number gets its unit here, and
 * thousands grouped; anything with letters in it already says what it is and is
 * left exactly as written.
 */
function withUnit(raw: string, unit: string): string {
  const trimmed = raw.trim();
  if (trimmed === '' || /[a-z]/i.test(trimmed)) return trimmed;
  // Integer runs only, so "2,200" and "1.5" keep their own punctuation.
  const grouped = trimmed.replace(/\d{4,}/g, (digits) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, ','));
  return `${grouped} ${unit}`;
}

/** "2200" → "2,200 kcal"; "1800-2000" → "1,800-2,000 kcal"; "1,950 kcal" unchanged. */
export function formatCalories(raw: string): string {
  return withUnit(raw, 'kcal');
}

/** "45" → "45 min"; "42 min" and "1 hr" unchanged. */
export function formatDuration(raw: string): string {
  return withUnit(raw, 'min');
}
