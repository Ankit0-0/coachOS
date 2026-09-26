import type { DevicePlatform } from "@prisma/client";

import { getLogger } from "../../config/logger.js";
import { prisma } from "../../config/prisma.config.js";
import { sendPushMessages, type PushMessage } from "../../utils/push.js";

/**
 * Stores this device's token for this user. The token is unique: a phone that
 * signs in as someone else moves to them, so the previous person stops getting
 * notifications on a device they no longer use.
 */
export async function registerPushToken(userId: string, input: { token: string; platform: DevicePlatform }) {
  await prisma.pushToken.upsert({
    where: { token: input.token },
    create: { userId, token: input.token, platform: input.platform },
    update: { userId, platform: input.platform },
  });
  getLogger().info({ userId, platform: input.platform }, "registerPushToken: token stored");
}

/** Sign-out: this device stops receiving this user's notifications. Scoped to the user so no one can remove another's token. */
export async function removePushToken(userId: string, token: string) {
  const { count } = await prisma.pushToken.deleteMany({ where: { userId, token } });
  getLogger().info({ userId, removed: count }, "removePushToken: token removed");
}

export type Notification = {
  title: string;
  body: string;
  /** A route in the receiving app to open when the notification is tapped. */
  url?: string;
};

/**
 * Sends one notification to every device of each user. Fire-and-forget by
 * design: it never throws, so a caller can `void notifyUsers(...)` after its
 * own work has succeeded without risking that work.
 */
export async function notifyUsers(userIds: string[], notification: Notification): Promise<void> {
  try {
    const unique = [...new Set(userIds)];
    if (unique.length === 0) return;
    const tokens = await prisma.pushToken.findMany({ where: { userId: { in: unique } }, select: { token: true } });
    const messages: PushMessage[] = tokens.map(({ token }) => ({
      to: token,
      title: notification.title,
      body: notification.body,
      ...(notification.url ? { data: { url: notification.url } } : {}),
    }));
    const unregistered = await sendPushMessages(messages);
    if (unregistered.length > 0) {
      await prisma.pushToken.deleteMany({ where: { token: { in: unregistered } } });
      getLogger().info({ removed: unregistered.length }, "notifyUsers: forgot tokens Expo reported as unregistered");
    }
  } catch (error) {
    getLogger().error({ err: error }, "notifyUsers: unexpected error");
  }
}

/**
 * Works out who to tell and what, then tells them — all after the caller has
 * returned. For events whose wording needs a lookup (a name), so that lookup
 * never delays or fails the request that caused the event.
 */
export function notifyInBackground(
  build: () => Promise<{ userIds: string[]; notification: Notification } | null>,
): void {
  void (async () => {
    try {
      const built = await build();
      if (built) await notifyUsers(built.userIds, built.notification);
    } catch (error) {
      getLogger().error({ err: error }, "notifyInBackground: could not build the notification");
    }
  })();
}

/** A user's display name, for wording a notification about them. */
export async function nameOf(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
  return user?.name ?? "Someone";
}
