import { z } from "zod";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** An S3 object key from POST /uploads/presign, never a URL or a raw path. */
const photoKeySchema = z.string().min(1).max(512);

export const checkInSchema = z.object({
  assignmentId: z.string().min(1),
  date: z.string().regex(DATE_PATTERN, "date must be formatted YYYY-MM-DD"),
  completedItemIds: z.array(z.string()),
  notes: z.string().max(2000).optional(),
  /**
   * { [itemId]: key } — merged into the stored map one item at a time, so an
   * app can add a single meal's photo without knowing the keys of the others
   * (it never sees them: reads only return signed URLs). A null value removes
   * that one photo; a null map clears every photo at once.
   */
  photoKeys: z.record(z.string().min(1), photoKeySchema.nullable()).nullable().optional(),
});

export const weightSchema = z.object({
  date: z.string().regex(DATE_PATTERN, "date must be formatted YYYY-MM-DD"),
  weightKg: z.number().positive(),
  photoKey: photoKeySchema.nullable().optional(),
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
