import { addDays, formatDateKey } from '@/lib/dates';

/** Every weigh-in ever logged, so "latest" is never cut off by a window. */
export function allWeightsRange(): { from: string; to: string } {
  return { from: '2000-01-01', to: formatDateKey(new Date()) };
}

export type WeightSummary = {
  latest: { weightKg: number; date: string };
  /** Mean of the entries in the 7 days ending on the latest one, to 0.1 kg. */
  sevenDayAverageKg: number;
};

/** Latest logged weight and its 7-day average; null with nothing logged. */
export function summarizeWeights(entries: readonly { date: string; weightKg: number }[]): WeightSummary | null {
  const first = entries[0];
  if (!first) return null;

  const latest = entries.reduce((best, entry) => (entry.date > best.date ? entry : best), first);
  // Anchored on the latest entry, not today, so a logging gap doesn't empty it.
  const windowStart = addDays(latest.date, -6);
  const week = entries.filter((entry) => entry.date >= windowStart && entry.date <= latest.date);
  const average = week.reduce((sum, entry) => sum + entry.weightKg, 0) / week.length;

  return {
    latest: { weightKg: latest.weightKg, date: latest.date },
    sevenDayAverageKg: Math.round(average * 10) / 10,
  };
}
