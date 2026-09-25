import type { SubscriptionPeriodInput } from '@/lib/api';
import { addMonths, formatDateKey, isDateKey } from '@/lib/dates';

/** Start and end as the coach typed them. Null is an open-ended relationship. */
export type PeriodDraft = { start: string; end: string } | null;

export const PERIOD_PRESETS = [1, 3, 6, 12] as const;
export type PeriodPreset = (typeof PERIOD_PRESETS)[number];

const DEFAULT_MONTHS: PeriodPreset = 3;

/** Starts today, ends three months out: the two-tap default. */
export function defaultPeriod(today: string = formatDateKey(new Date())): { start: string; end: string } {
  return { start: today, end: addMonths(today, DEFAULT_MONTHS) };
}

/** Which preset length the draft matches, 'open' for none, or null for custom dates. */
export function presetOf(draft: PeriodDraft): PeriodPreset | 'open' | null {
  if (draft === null) return 'open';
  if (!isDateKey(draft.start)) return null;
  return PERIOD_PRESETS.find((months) => addMonths(draft.start, months) === draft.end) ?? null;
}

/** Why the draft can't be sent, or null when it can. */
export function periodError(draft: PeriodDraft, today: string = formatDateKey(new Date())): string | null {
  if (draft === null) return null;
  if (!isDateKey(draft.start) || !isDateKey(draft.end)) return 'Enter both dates as YYYY-MM-DD.';
  // ISO dates sort as strings.
  if (draft.end <= draft.start) return 'The end date has to be after the start date.';
  if (draft.end < today) return 'That period has already ended. Pick an end date from today on.';
  return null;
}

/** The request body fields for a valid draft. */
export function periodInput(draft: PeriodDraft): SubscriptionPeriodInput | null {
  return draft === null ? null : { subscriptionStartDate: draft.start, subscriptionEndDate: draft.end };
}
