import { env } from "../config/env.js";
import { getLogger } from "../config/logger.js";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
/** Expo takes at most 100 messages per request. */
const CHUNK_SIZE = 100;

export type PushMessage = {
  to: string;
  title: string;
  body: string;
  /** Read by the apps when the notification is tapped; `url` is a route to open. */
  data?: Record<string, string>;
};

type ExpoTicket = { status: "ok"; id: string } | { status: "error"; message?: string; details?: { error?: string } };

/** Expo push tokens look like `ExponentPushToken[...]` (or the newer `ExpoPushToken[...]`). */
export function isExpoPushToken(token: string): boolean {
  return /^Expo(nent)?PushToken\[[^\]]+\]$/.test(token);
}

/**
 * Hands messages to Expo, which delivers through APNs and FCM. Returns the
 * tokens Expo reported as no longer registered (app uninstalled, token
 * rotated) so the caller can forget them. Never throws: a notification is a
 * courtesy, and its failure must not fail the request that caused it.
 */
export async function sendPushMessages(messages: PushMessage[]): Promise<string[]> {
  if (messages.length === 0) return [];
  if (!env.pushNotificationsEnabled) {
    getLogger().debug({ count: messages.length }, "push: disabled — not sending");
    return [];
  }

  const unregistered: string[] = [];
  for (let start = 0; start < messages.length; start += CHUNK_SIZE) {
    const chunk = messages.slice(start, start + CHUNK_SIZE).map((message) => ({ sound: "default", ...message }));
    try {
      const response = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...(env.expoAccessToken ? { Authorization: `Bearer ${env.expoAccessToken}` } : {}),
        },
        body: JSON.stringify(chunk),
      });
      if (!response.ok) {
        getLogger().error({ status: response.status, count: chunk.length }, "push: Expo rejected the request");
        continue;
      }
      const body = (await response.json()) as { data?: ExpoTicket[] };
      (body.data ?? []).forEach((ticket, index) => {
        if (ticket.status !== "error") return;
        const token = chunk[index]?.to;
        if (ticket.details?.error === "DeviceNotRegistered" && token) {
          unregistered.push(token);
        } else {
          getLogger().warn({ error: ticket.details?.error, message: ticket.message }, "push: Expo could not accept a message");
        }
      });
    } catch (error) {
      getLogger().error({ err: error, count: chunk.length }, "push: request to Expo failed");
    }
  }
  return unregistered;
}
