import type { ChipTone } from '@coachos/theme';

import type { AttentionReason, CoachInvite } from '@/lib/api';
import { daysBetween } from '@/lib/dates';

/** How the roster names each reason a client may need the coach. */
const ATTENTION_CHIPS: Record<AttentionReason, { label: string; tone: ChipTone }> = {
  PAYMENT_TO_CONFIRM: { label: 'Confirm payment', tone: 'partial' },
  EXPIRED: { label: 'Expired', tone: 'warning' },
  PAYMENT_OVERDUE: { label: 'Payment overdue', tone: 'danger' },
  QUIET: { label: 'Gone quiet', tone: 'danger' },
  NO_PLAN: { label: 'No plan', tone: 'partial' },
  RENEWAL_DUE: { label: 'Renewal due', tone: 'warning' },
};

/** The chip for a client's most pressing reason; null when all is well. The API sends them most pressing first. */
export function attentionChip(reasons: readonly AttentionReason[]): { label: string; tone: ChipTone } | null {
  const first = reasons[0];
  return first ? ATTENTION_CHIPS[first] : null;
}

/** "Checked in today", "… yesterday", "… 4 days ago", or "No check-ins yet". */
export function lastCheckInLabel(lastCheckInDate: string | null, today: string): string {
  if (!lastCheckInDate) return 'No check-ins yet';
  const days = daysBetween(lastCheckInDate, today);
  if (days <= 0) return 'Checked in today';
  if (days === 1) return 'Checked in yesterday';
  return `Checked in ${days} days ago`;
}

/** Clients who need the coach first, everyone else after; otherwise the order the API gave. */
export function sortByAttention(clients: readonly CoachInvite[]): CoachInvite[] {
  return clients
    .map((client, index) => ({ client, index }))
    .sort((a, b) => Number(b.client.attention.length > 0) - Number(a.client.attention.length > 0) || a.index - b.index)
    .map(({ client }) => client);
}

/** How many clients have at least one reason. */
export function attentionCount(clients: readonly CoachInvite[]): number {
  return clients.filter((client) => client.attention.length > 0).length;
}
