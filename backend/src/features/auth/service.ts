import type { Role, User } from "@prisma/client";

import { env } from "../../config/env.js";
import { APPLE_PROVIDER, GOOGLE_PROVIDER } from "../../constants/auth.js";
import { getLogger } from "../../config/logger.js";
import { prisma } from "../../config/prisma.config.js";
import { normalizeEmail } from "../../utils/email.js";
import { sendPasswordResetEmail } from "../../utils/mailer.js";
import { hashPassword, verifyPassword } from "../../utils/password.js";
import { generateResetCode, hashResetCode } from "../../utils/reset-code.js";
import { createAccessToken } from "../../utils/jwt.js";
import { verifyAppleIdentityToken } from "../../utils/apple-identity.js";
import { verifyGoogleIdToken } from "../../utils/google-identity.js";

const RESET_CODE_TTL_MINUTES = 15;
/** Failed guesses allowed against one token before it's burned. */
const RESET_MAX_ATTEMPTS = 5;

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

/**
 * Deliberately narrower than Prisma's `Role`. Admins exist only as the result
 * of running scripts/create-admin.ts by hand; there is no code path from a
 * request body to an ADMIN account, and this type is what keeps it that way
 * even if the route schema is ever loosened by accident.
 */
export type RegisterableRole = Extract<Role, "COACH" | "CLIENT">;

export async function register(input: {
  email: string;
  password: string;
  name: string;
  role: RegisterableRole;
}) {
  const email = normalizeEmail(input.email);
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    getLogger().debug({ email }, "register: rejected — email already in use");
    throw new Error("EMAIL_IN_USE");
  }

  const user = await prisma.user.create({
    data: {
      email,
      password: await hashPassword(input.password),
      name: input.name.trim(),
      role: input.role,
      // Coaches wait for an admin; clients have nothing to be approved for,
      // so the column stays null rather than carrying a meaningless value.
      ...(input.role === "COACH" ? { coachApprovalStatus: "PENDING" as const } : {}),
    },
  });
  getLogger().info({ userId: user.id, email, role: user.role }, "register: new user created");
  return result(user);
}

export async function login(input: { email: string; password: string }) {
  const email = normalizeEmail(input.email);
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    getLogger().warn({ email }, "login: rejected — no user with this email");
    throw new Error("INVALID_CREDENTIALS");
  }
  if (!user.password) {
    getLogger().warn({ email, userId: user.id }, "login: rejected — account has no password set (Google-only account)");
    throw new Error("INVALID_CREDENTIALS");
  }
  if (!(await verifyPassword(input.password, user.password))) {
    getLogger().warn({ email, userId: user.id }, "login: rejected — password did not match");
    throw new Error("INVALID_CREDENTIALS");
  }
  getLogger().info({ email, userId: user.id }, "login: successful");
  return result(user);
}

/**
 * Signs in through an identity provider, creating the user on first sign-in.
 * A returning user is found by the provider's own id; a first-time one is
 * linked to an existing account with the same (provider-verified) email, or
 * gets a new account with the role the app asked for.
 */
async function signInWithProvider(input: {
  provider: string;
  providerAccountId: string;
  email: string | undefined;
  name: string | undefined;
  role: RegisterableRole | undefined;
}) {
  const existingAccount = await prisma.account.findUnique({
    where: { provider_providerAccountId: { provider: input.provider, providerAccountId: input.providerAccountId } },
    include: { user: true },
  });
  if (existingAccount) return result(existingAccount.user);

  if (!input.email) {
    // Apple sends the email only on the very first sign-in; without it and
    // without a linked account there is no one to sign in as.
    getLogger().warn({ provider: input.provider }, "signInWithProvider: rejected — first sign-in without an email");
    throw new Error("INVALID_PROVIDER_TOKEN");
  }

  const email = normalizeEmail(input.email);
  const role = input.role ?? "CLIENT";
  const existingUser = await prisma.user.findUnique({ where: { email } });
  const user = existingUser
    ? existingUser
    : await prisma.user.create({
        data: {
          email,
          name: input.name?.trim() || email.split("@")[0] || email,
          role,
          // The same gate as a password sign-up: a coach waits for an admin.
          // Without it a coach who signed up this way would have no status,
          // never appear in the admin's pending list, and never be approved.
          ...(role === "COACH" ? { coachApprovalStatus: "PENDING" as const } : {}),
        },
      });
  if (!existingUser) {
    getLogger().info({ userId: user.id, email, role: user.role, provider: input.provider }, "signInWithProvider: new user created");
  }

  await prisma.account.create({
    data: { provider: input.provider, providerAccountId: input.providerAccountId, userId: user.id },
  });
  return result(user);
}

export async function loginWithGoogle(input: { idToken: string; role?: RegisterableRole }) {
  if (env.googleClientAudiences.length === 0) {
    getLogger().error("loginWithGoogle: rejected — GOOGLE_CLIENT_ID is not configured on the server");
    throw new Error("GOOGLE_NOT_CONFIGURED");
  }
  let identity: Awaited<ReturnType<typeof verifyGoogleIdToken>>;
  try {
    identity = await verifyGoogleIdToken(input.idToken);
  } catch (error) {
    getLogger().warn({ reason: error instanceof Error ? error.message : String(error) }, "loginWithGoogle: rejected — token failed verification");
    throw new Error("INVALID_GOOGLE_TOKEN");
  }
  if (!identity || !identity.emailVerified) {
    getLogger().warn(
      { hasIdentity: !!identity, emailVerified: identity?.emailVerified },
      "loginWithGoogle: rejected — Google token missing sub/email or email unverified",
    );
    throw new Error("INVALID_GOOGLE_TOKEN");
  }
  try {
    return await signInWithProvider({
      provider: GOOGLE_PROVIDER,
      providerAccountId: identity.sub,
      email: identity.email,
      name: identity.name,
      role: input.role,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_PROVIDER_TOKEN") throw new Error("INVALID_GOOGLE_TOKEN");
    throw error;
  }
}

export async function loginWithApple(input: { identityToken: string; name?: string; role?: RegisterableRole }) {
  if (env.appleBundleIds.length === 0) {
    getLogger().error("loginWithApple: rejected — APPLE_BUNDLE_IDS is not configured on the server");
    throw new Error("APPLE_NOT_CONFIGURED");
  }
  let identity: Awaited<ReturnType<typeof verifyAppleIdentityToken>>;
  try {
    identity = await verifyAppleIdentityToken(input.identityToken);
  } catch (error) {
    getLogger().warn({ reason: error instanceof Error ? error.message : String(error) }, "loginWithApple: rejected — token failed verification");
    throw new Error("INVALID_APPLE_TOKEN");
  }
  if (identity.email && !identity.emailVerified) {
    getLogger().warn("loginWithApple: rejected — Apple reported the email as unverified");
    throw new Error("INVALID_APPLE_TOKEN");
  }
  try {
    return await signInWithProvider({
      provider: APPLE_PROVIDER,
      providerAccountId: identity.sub,
      email: identity.email,
      name: input.name,
      role: input.role,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_PROVIDER_TOKEN") throw new Error("INVALID_APPLE_TOKEN");
    throw error;
  }
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
    getLogger().debug({ email }, "requestPasswordReset: no account for this email — responding generically anyway");
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
  getLogger().info({ email, userId: user.id }, "requestPasswordReset: reset code issued");
}

export async function resetPassword(input: { email: string; code: string; newPassword: string }) {
  const email = normalizeEmail(input.email);
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    getLogger().warn({ email }, "resetPassword: rejected — no account for this email");
    throw new Error("INVALID_RESET_CODE");
  }

  const token = await prisma.passwordResetToken.findFirst({
    where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!token) {
    getLogger().warn({ email, userId: user.id }, "resetPassword: rejected — no unused, unexpired code outstanding");
    throw new Error("INVALID_RESET_CODE");
  }

  if (token.attempts >= RESET_MAX_ATTEMPTS) {
    getLogger().warn(
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
    getLogger().warn(
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

  getLogger().info({ email, userId: user.id }, "resetPassword: password changed and outstanding codes invalidated");
}
