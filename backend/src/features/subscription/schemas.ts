import { z } from "zod";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const dateString = z.string().regex(DATE_PATTERN, "date must be formatted YYYY-MM-DD");

export const createSubscriptionSchema = z
  .object({
    startDate: dateString,
    endDate: dateString,
    notes: z.string().max(2000).optional(),
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
