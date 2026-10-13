/** Payment helpers. Same file in both apps. */

import type { ChipTone } from '@coachos/theme';

/**
 * Where a period's fee stands, as the API reports it. NONE: no fee. DUE:
 * unpaid, within 3 days of the start. OVERDUE: unpaid after that. REPORTED:
 * the client says they paid and you haven't confirmed. PAID: you confirmed.
 */
export type PaymentStatus = 'NONE' | 'DUE' | 'OVERDUE' | 'REPORTED' | 'PAID';

/** The same rule the API applies; it stores the ID lowercase. */
const UPI_ID = /^[a-z0-9._-]{2,256}@[a-z][a-z0-9.-]{1,64}$/;

export function isValidUpiId(text: string): boolean {
  return UPI_ID.test(text.trim().toLowerCase());
}

/** "₹4,500", "₹1,25,000": the Indian grouping, without relying on Intl being present. */
export function formatInr(amount: number): string {
  const digits = String(Math.round(Math.abs(amount)));
  const lastThree = digits.slice(-3);
  const rest = digits.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return `₹${rest ? `${rest},${lastThree}` : lastThree}`;
}

/** A whole-rupee fee from a text field: null when blank, undefined when not a valid amount. */
export function parseFee(text: string): number | null | undefined {
  const trimmed = text.trim().replace(/[₹,\s]/g, '');
  if (trimmed === '') return null;
  if (!/^\d+$/.test(trimmed)) return undefined;
  const value = Number(trimmed);
  return value >= 1 && value <= 10_000_000 ? value : undefined;
}

const CHIPS: Record<Exclude<PaymentStatus, 'NONE'>, { label: string; tone: ChipTone }> = {
  DUE: { label: 'Payment due', tone: 'warning' },
  OVERDUE: { label: 'Overdue', tone: 'danger' },
  REPORTED: { label: 'Client says paid', tone: 'partial' },
  PAID: { label: 'Paid', tone: 'success' },
};

export function paymentChip(status: PaymentStatus): { label: string; tone: ChipTone } | null {
  return status === 'NONE' ? null : CHIPS[status];
}

/** A plain-text receipt to share over WhatsApp or email. */
export function receiptText(input: {
  receiptNumber: string;
  coachName: string;
  clientName: string;
  amountInr: number;
  periodLabel: string;
  paidOn: string;
}): string {
  return [
    `Receipt ${input.receiptNumber}`,
    `${input.coachName} received ${formatInr(input.amountInr)} from ${input.clientName}`,
    `for coaching, ${input.periodLabel}.`,
    `Paid on ${input.paidOn}.`,
    '',
    'Sent from CoachFolio',
  ].join('\n');
}

/**
 * The upi://pay link that opens the client's UPI app with the coach, amount
 * and a note filled in. Android offers every installed UPI app; on iPhone it
 * opens whichever app claims upi://, so the UPI ID is also shown to copy.
 */
export function upiPayUrl(input: { upiId: string; payeeName: string; amountInr: number; note: string }): string {
  const params: [string, string][] = [
    ['pa', input.upiId],
    ['pn', input.payeeName],
    ['am', input.amountInr.toFixed(2)],
    ['cu', 'INR'],
    ['tn', input.note],
  ];
  // '@' stays literal: some UPI apps don't decode %40 in the payee address.
  const encode = (value: string) => encodeURIComponent(value).replace(/%40/g, '@');
  return `upi://pay?${params.map(([key, value]) => `${key}=${encode(value)}`).join('&')}`;
}
