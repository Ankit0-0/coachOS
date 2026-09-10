import type { ClientProfile, CoachProfile, User } from "@prisma/client";

import { logger } from "../../config/logger.js";
import { prisma } from "../../config/prisma.config.js";

function serializeCoachProfile(user: User, profile: CoachProfile | null) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    memberSince: user.createdAt,
    bio: profile?.bio ?? null,
    specialties: profile?.specialties ?? [],
    yearsExperience: profile?.yearsExperience ?? null,
    phone: profile?.phone ?? null,
  };
}

export async function getCoachProfile(coachId: string) {
  const [user, profile] = await Promise.all([
    prisma.user.findUnique({ where: { id: coachId } }),
    prisma.coachProfile.findUnique({ where: { userId: coachId } }),
  ]);
  if (!user) {
    logger.debug({ coachId }, "getCoachProfile: rejected — user record not found");
    throw new Error("USER_NOT_FOUND");
  }
  return serializeCoachProfile(user, profile);
}

export async function updateCoachProfile(
  coachId: string,
  input: {
    name?: string | undefined;
    bio?: string | undefined;
    specialties?: string[] | undefined;
    yearsExperience?: number | null | undefined;
    phone?: string | undefined;
  },
) {
  const { name, ...profileFields } = input;

  // The User row holds the name; everything else lives on CoachProfile, which
  // may not exist yet for coaches who have never opened this screen.
  const user = name !== undefined
    ? await prisma.user.update({ where: { id: coachId }, data: { name } })
    : await prisma.user.findUnique({ where: { id: coachId } });

  if (!user) {
    logger.debug({ coachId }, "updateCoachProfile: rejected — user record not found");
    throw new Error("USER_NOT_FOUND");
  }

  const hasProfileChanges = Object.values(profileFields).some((value) => value !== undefined);
  const profile = hasProfileChanges
    ? await prisma.coachProfile.upsert({
        where: { userId: coachId },
        update: {
          ...(profileFields.bio !== undefined ? { bio: profileFields.bio } : {}),
          ...(profileFields.specialties !== undefined ? { specialties: profileFields.specialties } : {}),
          ...(profileFields.yearsExperience !== undefined ? { yearsExperience: profileFields.yearsExperience } : {}),
          ...(profileFields.phone !== undefined ? { phone: profileFields.phone } : {}),
        },
        create: {
          userId: coachId,
          bio: profileFields.bio ?? null,
          specialties: profileFields.specialties ?? [],
          yearsExperience: profileFields.yearsExperience ?? null,
          phone: profileFields.phone ?? null,
        },
      })
    : await prisma.coachProfile.findUnique({ where: { userId: coachId } });

  logger.debug({ coachId, fields: Object.keys(input) }, "updateCoachProfile: profile updated");
  return serializeCoachProfile(user, profile);
}

function serializeClientProfile(user: User, profile: ClientProfile | null) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    memberSince: user.createdAt,
    heightCm: profile?.heightCm ?? null,
    weightKg: profile?.weightKg ?? null,
    goals: profile?.goals ?? null,
  };
}

export async function getClientProfile(clientId: string) {
  const [user, profile] = await Promise.all([
    prisma.user.findUnique({ where: { id: clientId } }),
    prisma.clientProfile.findUnique({ where: { userId: clientId } }),
  ]);
  if (!user) {
    logger.debug({ clientId }, "getClientProfile: rejected — user record not found");
    throw new Error("USER_NOT_FOUND");
  }
  return serializeClientProfile(user, profile);
}

export async function updateClientProfile(
  clientId: string,
  input: {
    name?: string | undefined;
    heightCm?: number | null | undefined;
    weightKg?: number | null | undefined;
    goals?: string | undefined;
  },
) {
  const { name, ...profileFields } = input;

  // The User row holds the name; the rest lives on ClientProfile, which may not
  // exist yet for clients who have never opened this screen.
  const user = name !== undefined
    ? await prisma.user.update({ where: { id: clientId }, data: { name } })
    : await prisma.user.findUnique({ where: { id: clientId } });

  if (!user) {
    logger.debug({ clientId }, "updateClientProfile: rejected — user record not found");
    throw new Error("USER_NOT_FOUND");
  }

  const hasProfileChanges = Object.values(profileFields).some((value) => value !== undefined);
  const profile = hasProfileChanges
    ? await prisma.clientProfile.upsert({
        where: { userId: clientId },
        update: {
          ...(profileFields.heightCm !== undefined ? { heightCm: profileFields.heightCm } : {}),
          ...(profileFields.weightKg !== undefined ? { weightKg: profileFields.weightKg } : {}),
          ...(profileFields.goals !== undefined ? { goals: profileFields.goals } : {}),
        },
        create: {
          userId: clientId,
          heightCm: profileFields.heightCm ?? null,
          weightKg: profileFields.weightKg ?? null,
          goals: profileFields.goals ?? null,
        },
      })
    : await prisma.clientProfile.findUnique({ where: { userId: clientId } });

  logger.debug({ clientId, fields: Object.keys(input) }, "updateClientProfile: profile updated");
  return serializeClientProfile(user, profile);
}
