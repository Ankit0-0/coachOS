import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "../src/config/prisma.config.js";
import { runSubscriptionReminders } from "../src/jobs/subscription-reminders.js";
import { sendPushMessages, type PushMessage } from "../src/utils/push.js";
import {
  api,
  cleanupUser,
  createAcceptedInvite,
  createAdmin,
  registerPendingCoach,
  registerUser,
  VALID_DIET_CONTENT,
  type TestUser,
} from "./helpers.js";

// Expo is stood in for; every message the backend would send lands here.
vi.mock("../src/utils/push.js", async (importOriginal) => {
  const original = await importOriginal<typeof import("../src/utils/push.js")>();
  return { ...original, sendPushMessages: vi.fn(async () => [] as string[]) };
});
const sent = vi.mocked(sendPushMessages);

function auth(user: TestUser) {
  return { Authorization: `Bearer ${user.token}` };
}

let tokenCounter = 0;
function expoToken(): string {
  tokenCounter += 1;
  return `ExponentPushToken[test-${Date.now()}-${tokenCounter}]`;
}

/** Every message sent so far to this token. */
function messagesTo(token: string): PushMessage[] {
  return sent.mock.calls.flatMap(([messages]) => messages).filter((message) => message.to === token);
}

async function withToken(user: TestUser, platform: "IOS" | "ANDROID" = "IOS"): Promise<string> {
  const token = expoToken();
  const res = await api.post("/v1/push-tokens").set(auth(user)).send({ token, platform });
  expect(res.status).toBe(201);
  return token;
}

const users: string[] = [];
async function user(role: "COACH" | "CLIENT", prefix: string) {
  const created = await registerUser(role, prefix);
  users.push(created.id);
  return created;
}

describe("push notifications", () => {
  beforeEach(() => sent.mockClear());

  afterAll(async () => {
    for (const id of users) await cleanupUser(id);
  });

  describe("/v1/push-tokens", () => {
    it("stores a token, moves it to whoever signs in on that device next, and removes it on sign-out", async () => {
      const first = await user("CLIENT", "pt-first");
      const second = await user("CLIENT", "pt-second");
      const token = await withToken(first);
      expect((await prisma.pushToken.findUnique({ where: { token } }))?.userId).toBe(first.id);

      const moved = await api.post("/v1/push-tokens").set(auth(second)).send({ token, platform: "ANDROID" });
      expect(moved.status).toBe(201);
      expect(await prisma.pushToken.findUnique({ where: { token } })).toMatchObject({ userId: second.id, platform: "ANDROID" });

      // Someone else can't remove it; its owner can.
      await api.delete("/v1/push-tokens").set(auth(first)).send({ token });
      expect(await prisma.pushToken.findUnique({ where: { token } })).not.toBeNull();
      expect((await api.delete("/v1/push-tokens").set(auth(second)).send({ token })).status).toBe(200);
      expect(await prisma.pushToken.findUnique({ where: { token } })).toBeNull();
    });

    it("rejects something that is not an Expo token, and anonymous callers", async () => {
      const client = await user("CLIENT", "pt-bad");
      expect((await api.post("/v1/push-tokens").set(auth(client)).send({ token: "hello", platform: "IOS" })).status).toBe(400);
      expect((await api.post("/v1/push-tokens").send({ token: expoToken(), platform: "IOS" })).status).toBe(401);
    });
  });

  describe("events", () => {
    it("tells the client about an invite and the coach about the answer", async () => {
      const coach = await user("COACH", "pn-coach");
      const client = await user("CLIENT", "pn-client");
      const coachToken = await withToken(coach);
      const clientToken = await withToken(client, "ANDROID");

      await createAcceptedInvite(coach, client);

      await vi.waitFor(() => {
        expect(messagesTo(clientToken)).toEqual([expect.objectContaining({ title: "New coach invite" })]);
        expect(messagesTo(coachToken)).toEqual([
          expect.objectContaining({ title: "Invite accepted", data: { url: `/clients/${client.id}` } }),
        ]);
      });
    });

    it("tells the client when a plan is assigned", async () => {
      const coach = await user("COACH", "pn-plan-coach");
      const client = await user("CLIENT", "pn-plan-client");
      await createAcceptedInvite(coach, client);
      const clientToken = await withToken(client);

      const plan = await api.post("/v1/coach/plans").set(auth(coach)).send({ type: "DIET", title: "Home-style veg", content: VALID_DIET_CONTENT });
      await api.post("/v1/coach/assignments").set(auth(coach)).send({ clientId: client.id, planId: plan.body.plan.id });

      await vi.waitFor(() => {
        expect(messagesTo(clientToken)).toEqual([
          expect.objectContaining({ title: "New diet plan", body: expect.stringContaining("Home-style veg"), data: { url: "/diet" } }),
        ]);
      });
    });

    it("tells a coach when an admin approves them", async () => {
      const coach = await registerPendingCoach("pn-pending");
      users.push(coach.id);
      const admin = await createAdmin("pn-admin");
      users.push(admin.id);
      const coachToken = await withToken(coach);

      expect((await api.post(`/v1/admin/coaches/${coach.id}/approve`).set(auth(admin))).status).toBe(200);

      await vi.waitFor(() => {
        expect(messagesTo(coachToken)).toEqual([expect.objectContaining({ title: "You're approved" })]);
      });
    });

    it("forgets a token Expo reports as no longer registered", async () => {
      const coach = await user("COACH", "pn-gone-coach");
      const client = await user("CLIENT", "pn-gone-client");
      const clientToken = await withToken(client);
      sent.mockImplementationOnce(async (messages) => messages.map((message) => message.to));

      await api.post("/v1/coach/invites").set(auth(coach)).send({ clientEmail: client.email });

      await vi.waitFor(async () => {
        expect(await prisma.pushToken.findUnique({ where: { token: clientToken } })).toBeNull();
      });
    });
  });

  describe("subscription ending reminder", () => {
    it("reminds coach and client once, and again after the end date moves", async () => {
      const coach = await user("COACH", "pn-sub-coach");
      const client = await user("CLIENT", "pn-sub-client");
      await createAcceptedInvite(coach, client);
      const coachToken = await withToken(coach);
      const clientToken = await withToken(client);

      const now = new Date();
      const day = (offset: number) => new Date(now.getTime() + offset * 86_400_000).toISOString().slice(0, 10);
      const created = await api
        .post(`/v1/coach/clients/${client.id}/subscriptions`)
        .set(auth(coach))
        .send({ startDate: day(-30), endDate: day(2) });
      expect(created.status).toBe(201);
      const subscriptionId = created.body.subscription.id as string;

      await runSubscriptionReminders(now);
      expect(messagesTo(coachToken)).toEqual([expect.objectContaining({ title: "Subscription ending soon", data: { url: `/clients/${client.id}` } })]);
      expect(messagesTo(clientToken)).toEqual([expect.objectContaining({ title: "Subscription ending soon" })]);

      sent.mockClear();
      await runSubscriptionReminders(now);
      expect(messagesTo(coachToken)).toEqual([]);

      await api.patch(`/v1/coach/clients/${client.id}/subscriptions/${subscriptionId}`).set(auth(coach)).send({ endDate: day(3) });
      await runSubscriptionReminders(now);
      expect(messagesTo(coachToken)).toHaveLength(1);
    });
  });
});
