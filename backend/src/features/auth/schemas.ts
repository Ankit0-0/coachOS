import { z } from "zod";

const role = z.enum(["COACH", "CLIENT"]);

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().trim().min(1).max(100),
  role,
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const googleSchema = z.object({
  idToken: z.string().min(1),
  role: role.optional(),
});

export const appleSchema = z.object({
  identityToken: z.string().min(1),
  /** Apple gives the app the person's name on the first sign-in only, never in the token. */
  name: z.string().trim().min(1).max(100).optional(),
  role: role.optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  email: z.string().email(),
  code: z.string().length(8),
  newPassword: z.string().min(8),
});
