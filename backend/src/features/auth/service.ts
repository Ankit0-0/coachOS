import { OAuth2Client } from "google-auth-library";
import type { Role, User } from "@prisma/client";

import { env } from "../../config/env.js";
import { GOOGLE_PROVIDER } from "../../constants/auth.js";
import { prisma } from "../../config/prisma.config.js";
import { normalizeEmail } from "../../utils/email.js";
import { hashPassword, verifyPassword } from "../../utils/password.js";
import { createAccessToken } from "../../utils/jwt.js";

const googleClient = new OAuth2Client(env.googleClientId);

type PublicUser = Pick<User, "id" | "email" | "name" | "role">;

function publicUser(user: User): PublicUser {
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

function result(user: User) {
  return {
    user: publicUser(user),
    accessToken: createAccessToken({ sub: user.id, email: user.email, name: user.name, role: user.role }),
  };
}

export async function register(input: { email: string; password: string; name: string; role: Role }) {
  const email = normalizeEmail(input.email);
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new Error("EMAIL_IN_USE");

  const user = await prisma.user.create({
    data: { email, password: await hashPassword(input.password), name: input.name.trim(), role: input.role },
  });
  return result(user);
}

export async function login(input: { email: string; password: string }) {
  const user = await prisma.user.findUnique({ where: { email: normalizeEmail(input.email) } });
  if (!user?.password || !(await verifyPassword(input.password, user.password))) {
    throw new Error("INVALID_CREDENTIALS");
  }
  return result(user);
}

export async function loginWithGoogle(input: { idToken: string; role?: Role }) {
  if (!env.googleClientId) throw new Error("GOOGLE_NOT_CONFIGURED");
  const ticket = await googleClient.verifyIdToken({
    idToken: input.idToken,
    audience: env.googleClientAudiences,
  });
  const payload = ticket.getPayload();
  if (!payload?.sub || !payload.email || payload.email_verified !== true) throw new Error("INVALID_GOOGLE_TOKEN");

  const email = normalizeEmail(payload.email);
  const existingAccount = await prisma.account.findUnique({
    where: { provider_providerAccountId: { provider: GOOGLE_PROVIDER, providerAccountId: payload.sub } },
    include: { user: true },
  });
  if (existingAccount) return result(existingAccount.user);

  const existingUser = await prisma.user.findUnique({ where: { email } });
  const user = existingUser
    ? existingUser
    : await prisma.user.create({
        data: {
          email,
          name: payload.name?.trim() || email.split("@")[0] || email,
          role: input.role ?? "CLIENT",
        },
      });

  await prisma.account.create({
    data: { provider: GOOGLE_PROVIDER, providerAccountId: payload.sub, userId: user.id },
  });
  return result(user);
}
