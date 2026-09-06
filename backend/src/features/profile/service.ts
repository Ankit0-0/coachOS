import type { CoachProfile, User } from "@prisma/client";

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
