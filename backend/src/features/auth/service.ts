import { OAuth2Client } from "google-auth-library";
import type { Role, User } from "@prisma/client";

import { env } from "../../config/env.js";
import { GOOGLE_PROVIDER } from "../../constants/auth.js";
import { logger } from "../../config/logger.js";
import { prisma } from "../../config/prisma.config.js";
import { normalizeEmail } from "../../utils/email.js";
import { sendPasswordResetEmail } from "../../utils/mailer.js";
import { hashPassword, verifyPassword } from "../../utils/password.js";
import { generateResetCode, hashResetCode } from "../../utils/reset-code.js";
import { createAccessToken } from "../../utils/jwt.js";

const RESET_CODE_TTL_MINUTES = 15;
/** Failed guesses allowed against one token before it's burned. */
const RESET_MAX_ATTEMPTS = 5;

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
  if (existing) {
    logger.debug({ email }, "register: rejected — email already in use");
    throw new Error("EMAIL_IN_USE");
  }

  const user = await prisma.user.create({
    data: { email, password: await hashPassword(input.password), name: input.name.trim(), role: input.role },
  });
  logger.debug({ userId: user.id, email, role: user.role }, "register: new user created");
  return result(user);
}

export async function login(input: { email: string; password: string }) {
  const email = normalizeEmail(input.email);
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    logger.debug({ email }, "login: rejected — no user with this email");
    throw new Error("INVALID_CREDENTIALS");
  }
  if (!user.password) {
    logger.debug({ email, userId: user.id }, "login: rejected — account has no password set (Google-only account)");
    throw new Error("INVALID_CREDENTIALS");
  }
  if (!(await verifyPassword(input.password, user.password))) {
    logger.debug({ email, userId: user.id }, "login: rejected — password did not match");
    throw new Error("INVALID_CREDENTIALS");
  }
  logger.debug({ email, userId: user.id }, "login: successful");
  return result(user);
}

export async function loginWithGoogle(input: { idToken: string; role?: Role }) {
  if (!env.googleClientId) {
    logger.debug("loginWithGoogle: rejected — GOOGLE_CLIENT_ID is not configured on the server");
    throw new Error("GOOGLE_NOT_CONFIGURED");
  }
  const ticket = await googleClient.verifyIdToken({
    idToken: input.idToken,
    audience: env.googleClientAudiences,
  });
  const payload = ticket.getPayload();
  if (!payload?.sub || !payload.email || payload.email_verified !== true) {
    logger.debug(
      { hasSub: !!payload?.sub, hasEmail: !!payload?.email, emailVerified: payload?.email_verified },
      "loginWithGoogle: rejected — Google token payload missing sub/email or email unverified",
    );
    throw new Error("INVALID_GOOGLE_TOKEN");
  }

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

/**
 * Issues a reset code if the address belongs to an account. Callers must
 * respond identically either way — whether an email is registered is not
 * something this endpoint should reveal.
 */
export async function requestPasswordReset(input: { email: string }) {
  const email = normalizeEmail(input.email);
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    logger.debug({ email }, "requestPasswordReset: no account for this email — responding generically anyway");
    return;
  }

  const code = generateResetCode();
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      codeHash: hashResetCode(code),
      expiresAt: new Date(Date.now() + RESET_CODE_TTL_MINUTES * 60 * 1000),
    },
  });

  await sendPasswordResetEmail(user.email, code);
  logger.debug({ email, userId: user.id }, "requestPasswordReset: reset code issued");
}

export async function resetPassword(input: { email: string; code: string; newPassword: string }) {
  const email = normalizeEmail(input.email);
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    logger.debug({ email }, "resetPassword: rejected — no account for this email");
    throw new Error("INVALID_RESET_CODE");
  }

  const token = await prisma.passwordResetToken.findFirst({
    where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!token) {
    logger.debug({ email, userId: user.id }, "resetPassword: rejected — no unused, unexpired code outstanding");
    throw new Error("INVALID_RESET_CODE");
  }

  if (token.attempts >= RESET_MAX_ATTEMPTS) {
    logger.debug(
      { email, userId: user.id, tokenId: token.id, attempts: token.attempts },
      "resetPassword: rejected — too many failed attempts against this code",
    );
    throw new Error("INVALID_RESET_CODE");
  }

  if (token.codeHash !== hashResetCode(input.code)) {
    const updated = await prisma.passwordResetToken.update({
      where: { id: token.id },
      data: { attempts: { increment: 1 } },
    });
    logger.debug(
      { email, userId: user.id, tokenId: token.id, attempts: updated.attempts },
      "resetPassword: rejected — code did not match",
    );
    throw new Error("INVALID_RESET_CODE");
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { password: await hashPassword(input.newPassword) },
    }),
    // Burn every outstanding code, not just this one, so an older code from a
    // previous request can't be replayed after the password has changed.
    prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    }),
  ]);

  logger.debug({ email, userId: user.id }, "resetPassword: password changed and outstanding codes invalidated");
}
