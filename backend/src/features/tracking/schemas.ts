import { z } from "zod";

import { MAX_WEIGHT_KG } from "../../utils/weight.js";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** An S3 object key from POST /uploads/presign, never a URL or a raw path. */
const photoKeySchema = z.string().min(1).max(512);

const MAX_LIFT_KG = 1000;
const MAX_REPS = 1000;
/** Far more than any plan has in a day (30 exercises × 20 sets is the cap). */
const MAX_SET_LOGS_PER_SAVE = 600;

/** One set as performed. Weight 0 is fine (bodyweight); either may be left out. */
export const setLogSchema = z.object({
  weightKg: z.number().min(0).max(MAX_LIFT_KG).nullable(),
  reps: z.number().int().min(0).max(MAX_REPS).nullable(),
});

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
  /**
   * { [itemId]: comment } for the coach, merged one item at a time like
   * photoKeys. A null or blank comment removes that item's note.
   */
  itemNotes: z.record(z.string().min(1).max(200), z.string().trim().max(500).nullable()).optional(),
  /**
   * { [setId]: { weightKg, reps } } — what was actually lifted, merged one set
   * at a time like itemNotes. A null entry, or both numbers null, removes it.
   */
  setLogs: z
    .record(z.string().min(1).max(200), setLogSchema.nullable())
    .refine((logs) => Object.keys(logs).length <= MAX_SET_LOGS_PER_SAVE, "too many sets in one save")
    .optional(),
});

export const weightSchema = z.object({
  date: z.string().regex(DATE_PATTERN, "date must be formatted YYYY-MM-DD"),
  weightKg: z.number().positive().max(MAX_WEIGHT_KG),
  photoKey: photoKeySchema.nullable().optional(),
});

export const checkInQuerySchema = z.object({
  assignmentId: z.string().min(1),
  from: z.string().regex(DATE_PATTERN, "from must be formatted YYYY-MM-DD"),
  to: z.string().regex(DATE_PATTERN, "to must be formatted YYYY-MM-DD"),
});

/** GET /tracking/exercise-history and the coach's exercise progress. */
export const exerciseHistoryQuerySchema = z.object({
  from: z.string().regex(DATE_PATTERN, "from must be formatted YYYY-MM-DD"),
  to: z.string().regex(DATE_PATTERN, "to must be formatted YYYY-MM-DD"),
});

export const weightQuerySchema = z.object({
  from: z.string().regex(DATE_PATTERN, "from must be formatted YYYY-MM-DD"),
  to: z.string().regex(DATE_PATTERN, "to must be formatted YYYY-MM-DD"),
});
