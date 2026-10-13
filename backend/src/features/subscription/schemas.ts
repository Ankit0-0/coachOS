import { z } from "zod";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const dateString = z.string().regex(DATE_PATTERN, "date must be formatted YYYY-MM-DD");

/**
 * The first subscription period a coach picks when inviting a client or
 * accepting their request. Both or neither: neither is an open-ended
 * relationship with no subscription record.
 */
export const firstPeriodFields = {
  subscriptionStartDate: dateString.optional(),
  subscriptionEndDate: dateString.optional(),
};

export function isValidFirstPeriod(value: { subscriptionStartDate?: string | undefined; subscriptionEndDate?: string | undefined }) {
  const { subscriptionStartDate: start, subscriptionEndDate: end } = value;
  if (start === undefined && end === undefined) return true;
  // ISO dates sort lexicographically.
  return start !== undefined && end !== undefined && end > start;
}

/** A period's fee in whole rupees; null removes it. */
const amountInrSchema = z.number().int().min(1).max(10_000_000).nullable();

export const createSubscriptionSchema = z
  .object({
    startDate: dateString,
    endDate: dateString,
    notes: z.string().max(2000).optional(),
    amountInr: amountInrSchema.optional(),
    /** Recording a fee that was already paid (cash, or before CoachFolio), so no reminder goes out. */
    alreadyPaid: z.boolean().optional(),
  })
  // Compared as strings, which is safe because ISO dates sort lexicographically.
  .refine((value) => value.endDate > value.startDate, {
    message: "endDate must be after startDate",
    path: ["endDate"],
  });

export const updateSubscriptionSchema = z
  .object({
    startDate: dateString.optional(),
    endDate: dateString.optional(),
    status: z.enum(["ACTIVE", "EXPIRED", "CANCELLED"]).optional(),
    notes: z.string().max(2000).optional(),
    amountInr: amountInrSchema.optional(),
    alreadyPaid: z.boolean().optional(),
  })
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: "at least one field must be provided",
  })
  // Only checkable here when both arrive together; the service re-checks
  // against the stored row when only one side is being moved.
  .refine((value) => !(value.startDate && value.endDate) || value.endDate > value.startDate, {
    message: "endDate must be after startDate",
    path: ["endDate"],
  });

/** The coach confirming the money arrived (paid: true), or undoing that (paid: false). */
export const setPaymentSchema = z.object({ paid: z.boolean() });

/** The client saying they paid, with the UPI reference if they have it. */
export const reportPaymentSchema = z.object({
  reference: z.string().trim().max(64).optional(),
});
