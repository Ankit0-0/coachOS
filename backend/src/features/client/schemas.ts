import { z } from "zod";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const checkInsQuerySchema = z.object({
  /**
   * Optional. Omit to get every check-in this client logged in the range,
   * across all their assignments — otherwise a coach loses the client's
   * history the moment they switch them onto a different plan.
   */
  assignmentId: z.string().min(1).optional(),
  from: z.string().regex(DATE_PATTERN, "from must be formatted YYYY-MM-DD"),
  to: z.string().regex(DATE_PATTERN, "to must be formatted YYYY-MM-DD"),
});

export const weightQuerySchema = z.object({
  from: z.string().regex(DATE_PATTERN, "from must be formatted YYYY-MM-DD"),
  to: z.string().regex(DATE_PATTERN, "to must be formatted YYYY-MM-DD"),
});
