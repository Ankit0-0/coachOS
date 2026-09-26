import { getLogger } from "../config/logger.js";
import { prisma } from "../config/prisma.config.js";
import * as messages from "../features/notification/messages.js";
import { notifyUsers } from "../features/notification/service.js";
import { addDays, dateKeyOf, parseDateKey } from "../utils/calendar.js";

/** How far ahead an ending subscription is flagged: enough time to talk about renewing. */
export const REMINDER_DAYS_AHEAD = 3;
const HOUR_MS = 60 * 60 * 1000;

function readableDate(value: Date): string {
  return value.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}

/**
 * Tells coach and client once when an active subscription ends within the
 * next few days. Idempotent: `endingReminderSentAt` is set as each reminder
 * goes out, so running this every hour sends each one exactly once.
 * Returns how many subscriptions were reminded about.
 */
export async function runSubscriptionReminders(now = new Date()): Promise<number> {
  const today = parseDateKey(dateKeyOf(now));
  const horizon = parseDateKey(addDays(dateKeyOf(now), REMINDER_DAYS_AHEAD));
  const due = await prisma.subscription.findMany({
    where: { status: "ACTIVE", endingReminderSentAt: null, endDate: { gte: today, lte: horizon } },
    include: { coach: { select: { name: true } }, client: { select: { name: true } } },
  });

  for (const subscription of due) {
    // Claimed first, conditionally, so two overlapping runs can't both send it.
    const claimed = await prisma.subscription.updateMany({
      where: { id: subscription.id, endingReminderSentAt: null },
      data: { endingReminderSentAt: now },
    });
    if (claimed.count !== 1) continue;
    const endDate = readableDate(subscription.endDate);
    await notifyUsers(
      [subscription.coachId],
      messages.subscriptionEndingForCoach(subscription.client.name, subscription.clientId, endDate),
    );
    await notifyUsers([subscription.clientId], messages.subscriptionEndingForClient(subscription.coach.name, endDate));
  }
  if (due.length > 0) getLogger().info({ count: due.length }, "subscriptionReminders: reminders sent");
  return due.length;
}

/**
 * Runs the reminder check a minute after start and then hourly. In-process on
 * purpose: one small web service, no separate worker to pay for. Hourly rather
 * than daily so a restart or a sleeping instance only ever delays a reminder.
 */
export function startReminderJobs(): () => void {
  const run = () => {
    runSubscriptionReminders().catch((error: unknown) => {
      getLogger().error({ err: error }, "subscriptionReminders: run failed");
    });
  };
  const first = setTimeout(run, 60 * 1000);
  const every = setInterval(run, HOUR_MS);
  first.unref();
  every.unref();
  return () => {
    clearTimeout(first);
    clearInterval(every);
  };
}
