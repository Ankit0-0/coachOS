import type { ClientSubscription } from '@/lib/api';
import { longDateLabel } from '@/lib/dates';

export type SubscriptionSummary = {
  label: 'Active' | 'Expired' | 'Cancelled';
  tone: 'success' | 'warning' | 'neutral';
  /** The one line that matters: time left while it runs, when it ended once it hasn't. */
  detail: string;
  startLabel: string;
  endLabel: string;
  /** "Ends" while it runs, "Ended" after. */
  endHeading: string;
};

/**
 * The API sends these @db.Date columns as UTC-midnight timestamps. Only the
 * calendar date means anything, so it's read from the string rather than
 * through a Date, which would show the day before anywhere west of UTC.
 */
function calendarDate(value: string): string {
  return longDateLabel(value.slice(0, 10));
}

/** How a subscription reads on the client's coach page. Status and days left come from the API. */
export function summariseSubscription(subscription: ClientSubscription): SubscriptionSummary {
  const startLabel = calendarDate(subscription.startDate);
  const endLabel = calendarDate(subscription.endDate);

  if (subscription.status === 'ACTIVE') {
    const days = subscription.daysRemaining;
    return {
      label: 'Active',
      tone: 'success',
      detail: days === 0 ? 'Today is the last day' : `${days} ${days === 1 ? 'day' : 'days'} left`,
      startLabel,
      endLabel,
      endHeading: 'Ends',
    };
  }
  if (subscription.status === 'CANCELLED') {
    return { label: 'Cancelled', tone: 'neutral', detail: 'This period was cancelled', startLabel, endLabel, endHeading: 'Ended' };
  }
  return { label: 'Expired', tone: 'warning', detail: `Expired on ${endLabel}`, startLabel, endLabel, endHeading: 'Ended' };
}
