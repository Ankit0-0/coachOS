import type { Subscription } from "@prisma/client";

/** Days after a period starts before an unpaid fee counts as overdue. */
export const PAYMENT_GRACE_DAYS = 3;

/**
 * Where a period's fee stands. NONE: no fee set, or the period was cancelled.
 * PAID: the coach confirmed it. REPORTED: the client says they paid and the
 * coach hasn't confirmed yet. DUE: unpaid, within the grace days of the start
 * (or not started yet). OVERDUE: unpaid past them.
 */
export type PaymentStatus = "NONE" | "PAID" | "REPORTED" | "DUE" | "OVERDUE";

type PaymentFields = Pick<Subscription, "status" | "startDate" | "amountInr" | "paidAt" | "clientReportedPaidAt">;

export function paymentStatus(subscription: PaymentFields, today: Date): PaymentStatus {
  if (subscription.amountInr === null || subscription.status === "CANCELLED") return "NONE";
  if (subscription.paidAt) return "PAID";
  if (subscription.clientReportedPaidAt) return "REPORTED";
  const overdueFrom = new Date(subscription.startDate.getTime() + PAYMENT_GRACE_DAYS * 86_400_000);
  return today > overdueFrom ? "OVERDUE" : "DUE";
}

/** A short, stable number to quote on a receipt. */
export function receiptNumber(subscriptionId: string): string {
  return `CF-${subscriptionId.slice(-8).toUpperCase()}`;
}

/** "₹4,500" in the Indian grouping. */
export function formatInr(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}
