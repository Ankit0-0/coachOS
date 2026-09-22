import type { DevicePlatform } from "@prisma/client";

import { getLogger } from "../../config/logger.js";
import { prisma } from "../../config/prisma.config.js";
import { emailDomain, normalizeEmail } from "../../utils/email.js";

/**
 * Records an early-access signup, or updates the platform of one already on the
 * list. Signing up twice is not an error and is answered exactly like the first
 * time: a 409 would let anyone test whether an address is on the list, which is
 * the same thing forgot-password refuses to reveal.
 */
export async function recordEarlyAccessSignup(input: { email: string; platform: DevicePlatform }): Promise<void> {
  const email = normalizeEmail(input.email);

  const signup = await prisma.earlyAccessSignup.upsert({
    where: { email },
    create: { email, platform: input.platform },
    update: { platform: input.platform },
  });

  // The domain says enough to see where signups come from; the address itself is
  // someone's personal data and stays out of the logs.
  getLogger().info(
    { signupId: signup.id, platform: signup.platform, emailDomain: emailDomain(email) },
    "earlyAccess: signup recorded",
  );
}

export type EarlyAccessList = {
  signups: { id: string; email: string; platform: DevicePlatform; createdAt: Date }[];
  total: number;
  /** How many are waiting per store, so a launch can be planned around it. */
  countsByPlatform: Record<DevicePlatform, number>;
};

/** The whole list for an admin, newest first. */
export async function listEarlyAccessSignups(): Promise<EarlyAccessList> {
  const [signups, grouped] = await Promise.all([
    prisma.earlyAccessSignup.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.earlyAccessSignup.groupBy({ by: ["platform"], _count: { _all: true } }),
  ]);

  const countsByPlatform: Record<DevicePlatform, number> = { IOS: 0, ANDROID: 0 };
  for (const row of grouped) countsByPlatform[row.platform] = row._count._all;

  return { signups, total: signups.length, countsByPlatform };
}
