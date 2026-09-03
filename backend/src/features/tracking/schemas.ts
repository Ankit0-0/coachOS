import { z } from "zod";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const checkInSchema = z.object({
  assignmentId: z.string().min(1),
  date: z.string().regex(DATE_PATTERN, "date must be formatted YYYY-MM-DD"),
  completedItemIds: z.array(z.string()),
  notes: z.string().max(2000).optional(),
});

export const weightSchema = z.object({
  date: z.string().regex(DATE_PATTERN, "date must be formatted YYYY-MM-DD"),
  weightKg: z.number().positive(),
  photoUrl: z.string().max(2048).optional(),
});

export const checkInQuerySchema = z.object({
  assignmentId: z.string().min(1),
  from: z.string().regex(DATE_PATTERN, "from must be formatted YYYY-MM-DD"),
  to: z.string().regex(DATE_PATTERN, "to must be formatted YYYY-MM-DD"),
});

export const weightQuerySchema = z.object({
  from: z.string().regex(DATE_PATTERN, "from must be formatted YYYY-MM-DD"),
  to: z.string().regex(DATE_PATTERN, "to must be formatted YYYY-MM-DD"),
});
