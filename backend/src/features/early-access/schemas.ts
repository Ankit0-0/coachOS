import { z } from "zod";

/**
 * The landing page's early-access form. Two fields and nothing else: an email
 * to write to, and which store to tell them about.
 */
export const earlyAccessSignupSchema = z.object({
  // 254 is the longest a mail address can be, and the column is unbounded text.
  email: z.string().trim().min(3).max(254).email(),
  platform: z.enum(["IOS", "ANDROID"]),
});
