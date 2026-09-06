import { z } from "zod";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const checkInsQuerySchema = z.object({
  assignmentId: z.string().min(1),
  from: z.string().regex(DATE_PATTERN, "from must be formatted YYYY-MM-DD"),
  to: z.string().regex(DATE_PATTERN, "to must be formatted YYYY-MM-DD"),
});

export const weightQuerySchema = z.object({
  from: z.string().regex(DATE_PATTERN, "from must be formatted YYYY-MM-DD"),
  to: z.string().regex(DATE_PATTERN, "to must be formatted YYYY-MM-DD"),
});
