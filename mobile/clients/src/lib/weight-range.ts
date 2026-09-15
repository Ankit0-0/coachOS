import { lastMonthsRange, lastNDaysRange } from '@/lib/dates';

export type WeightRangeKey = 'week' | 'month' | 'quarter' | 'year';

export const WEIGHT_RANGES: { key: WeightRangeKey; label: string }[] = [
  { key: 'week', label: '1 week' },
  { key: 'month', label: '1 month' },
  { key: 'quarter', label: '3 months' },
  { key: 'year', label: '1 year' },
];

export const DEFAULT_WEIGHT_RANGE: WeightRangeKey = 'month';

/** The calendar dates a range covers, ending today. */
export function weightRangeDates(key: WeightRangeKey): { from: string; to: string } {
  switch (key) {
    case 'week':
      return lastNDaysRange(7);
    case 'month':
      return lastMonthsRange(1);
    case 'quarter':
      return lastMonthsRange(3);
    case 'year':
      return lastMonthsRange(12);
  }
}
