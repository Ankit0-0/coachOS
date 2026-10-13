import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "../src/config/prisma.config.js";
import { sendPushMessages, type PushMessage } from "../src/utils/push.js";
import {
  api,
  cleanupUser,
  createAcceptedInvite,
  registerUser,
  VALID_DIET_CONTENT,
  VALID_WORKOUT_CONTENT,
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

const users: string[] = [];
async function user(role: "COACH" | "CLIENT", prefix: string) {
  const created = await registerUser(role, prefix);
  users.push(created.id);
  return created;
}

/** A coach and an accepted client, with a workout plan assigned. */
async function coachedClient(prefix: string, startDate?: string) {
  const coach = await user("COACH", `${prefix}-coach`);
  const client = await user("CLIENT", `${prefix}-client`);
  await createAcceptedInvite(coach, client);
  const plan = await api
    .post("/v1/coach/plans")
    .set(auth(coach))
    .send({ type: "WORKOUT", title: `${prefix} plan`, content: VALID_WORKOUT_CONTENT });
  expect(plan.status).toBe(201);
  const assigned = await api
    .post("/v1/coach/assignments")
    .set(auth(coach))
    .send({ clientId: client.id, planId: plan.body.plan.id, ...(startDate ? { startDate } : {}) });
  expect(assigned.status).toBe(201);
  return { coach, client, planId: plan.body.plan.id as string, assignmentId: assigned.body.assignment.id as string };
}

function dateKey(daysFromToday: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + daysFromToday);
  return date.toISOString().slice(0, 10);
}

async function rosterEntry(coach: TestUser, clientId: string) {
  const res = await api.get("/v1/coach/invites?status=ACCEPTED").set(auth(coach));
  expect(res.status).toBe(200);
  return (res.body.invites as { clientId: string; attention: string[]; lastCheckInDate: string | null }[]).find(
    (invite) => invite.clientId === clientId,
  );
}

async function withToken(member: TestUser): Promise<string> {
  const token = `ExponentPushToken[workflow-${member.id}]`;
  expect((await api.post("/v1/push-tokens").set(auth(member)).send({ token, platform: "IOS" })).status).toBe(201);
  return token;
}

/**
 * Messages to this token about check-ins or the relationship ending. Setup
 * sends its own pushes in the background (invite accepted, plan assigned),
 * which can land after a test registers its token, so those are left out.
 */
const WATCHED = /checked in|New comment|Coaching ended/;
function messagesTo(token: string): PushMessage[] {
  return sent.mock.calls
    .flatMap(([messages]) => messages)
    .filter((message) => message.to === token && WATCHED.test(message.title));
}

afterAll(async () => {
  for (const id of users) await cleanupUser(id);
});

describe("POST /v1/coach/clients/:clientId/end", () => {
  it("ends the relationship and cancels plans and the subscription, keeping the client's history and account", async () => {
    const { coach, client, assignmentId } = await coachedClient("end");
    await api
      .post(`/v1/coach/clients/${client.id}/subscriptions`)
      .set(auth(coach))
      .send({ startDate: dateKey(-10), endDate: dateKey(20) });
    await api.post("/v1/tracking/checkin").set(auth(client)).send({ assignmentId, date: dateKey(0), completedItemIds: ["push-up"] });

    const res = await api.post(`/v1/coach/clients/${client.id}/end`).set(auth(coach));

    expect(res.status).toBe(200);
    expect((await api.get(`/v1/coach/clients/${client.id}/profile`).set(auth(coach))).status).toBe(403);
    expect((await prisma.planAssignment.findUniqueOrThrow({ where: { id: assignmentId } })).status).toBe("CANCELLED");
    expect(await prisma.subscription.count({ where: { coachId: coach.id, clientId: client.id, status: "ACTIVE" } })).toBe(0);
    expect(await prisma.checkIn.count({ where: { assignmentId } })).toBe(1);
    expect(await prisma.user.findUnique({ where: { id: client.id } })).not.toBeNull();
    expect((await api.get("/v1/coach/invites?status=ACCEPTED").set(auth(coach))).body.invites).toEqual([]);
  });

  it("tells the client their coaching ended", async () => {
    const { coach, client } = await coachedClient("end-push");
    const token = await withToken(client);
    sent.mockClear();

    await api.post(`/v1/coach/clients/${client.id}/end`).set(auth(coach));

    await vi.waitFor(() => {
      expect(messagesTo(token)).toEqual([expect.objectContaining({ title: "Coaching ended" })]);
    });
  });

  it("refuses someone who isn't this coach's client, and a second removal", async () => {
    const { coach, client } = await coachedClient("end-twice");
    const stranger = await user("CLIENT", "end-stranger");

    expect((await api.post(`/v1/coach/clients/${stranger.id}/end`).set(auth(coach))).status).toBe(403);
    expect((await api.post(`/v1/coach/clients/${client.id}/end`).set(auth(coach))).status).toBe(200);
    expect((await api.post(`/v1/coach/clients/${client.id}/end`).set(auth(coach))).status).toBe(403);
    expect((await api.post(`/v1/coach/clients/${client.id}/end`).set(auth(client))).status).toBe(403);
  });

  it("lets the coach invite the same client again afterwards", async () => {
    const { coach, client } = await coachedClient("end-again");
    await api.post(`/v1/coach/clients/${client.id}/end`).set(auth(coach));

    const again = await api.post("/v1/coach/invites").set(auth(coach)).send({ clientEmail: client.email });
    expect(again.status).toBe(201);
  });
});

describe("POST /v1/coach/invites/:id/cancel", () => {
  it("withdraws a pending invite, which then disappears for the client", async () => {
    const coach = await user("COACH", "cancel-coach");
    const client = await user("CLIENT", "cancel-client");
    const invite = await api.post("/v1/coach/invites").set(auth(coach)).send({ clientEmail: client.email });

    const res = await api.post(`/v1/coach/invites/${invite.body.invite.id}/cancel`).set(auth(coach));

    expect(res.status).toBe(200);
    expect(res.body.invite.status).toBe("CANCELLED");
    expect((await api.get("/v1/client/invites").set(auth(client))).body.invites).toEqual([]);
    expect((await api.post(`/v1/client/invites/${invite.body.invite.id}/accept`).set(auth(client))).status).toBe(409);
  });

  it("refuses another coach, an answered invite, and an unknown id", async () => {
    const coach = await user("COACH", "cancel-owner");
    const other = await user("COACH", "cancel-other");
    const client = await user("CLIENT", "cancel-answered");
    const inviteId = await createAcceptedInvite(coach, client);

    expect((await api.post(`/v1/coach/invites/${inviteId}/cancel`).set(auth(other))).status).toBe(403);
    expect((await api.post(`/v1/coach/invites/${inviteId}/cancel`).set(auth(coach))).status).toBe(409);
    expect((await api.post("/v1/coach/invites/no-such-invite/cancel").set(auth(coach))).status).toBe(404);
  });
});

describe("POST /v1/coach/assignments/:id/customize", () => {
  it("gives the client their own copy, so editing it leaves the original and other clients alone", async () => {
    const { coach, client, planId, assignmentId } = await coachedClient("custom");
    const other = await user("CLIENT", "custom-other");
    await createAcceptedInvite(coach, other);
    await api.post("/v1/coach/assignments").set(auth(coach)).send({ clientId: other.id, planId });

    const res = await api.post(`/v1/coach/assignments/${assignmentId}/customize`).set(auth(coach));

    expect(res.status).toBe(200);
    const copy = res.body.assignment.plan;
    expect(res.body.assignment.id).toBe(assignmentId);
    expect(copy.id).not.toBe(planId);
    expect(copy.customForClientId).toBe(client.id);
    expect(copy.title).toBe("custom plan");
    expect(copy.content).toEqual((await api.get(`/v1/coach/plans/${planId}`).set(auth(coach))).body.plan.content);

    const edited = await api
      .patch(`/v1/coach/plans/${copy.id}`)
      .set(auth(coach))
      .send({ title: "Just for this client" });
    expect(edited.status).toBe(200);
    expect((await api.get(`/v1/coach/plans/${planId}`).set(auth(coach))).body.plan.title).toBe("custom plan");
  });

  it("keeps copies out of the plan library and its limit, and never assigns one to another client", async () => {
    const { coach, assignmentId } = await coachedClient("custom-library");
    const other = await user("CLIENT", "custom-library-other");
    await createAcceptedInvite(coach, other);
    const copy = (await api.post(`/v1/coach/assignments/${assignmentId}/customize`).set(auth(coach))).body.assignment.plan;

    const library = await api.get("/v1/coach/plans?type=WORKOUT").set(auth(coach));
    expect(library.body.own.map((plan: { id: string }) => plan.id)).not.toContain(copy.id);

    const reassigned = await api.post("/v1/coach/assignments").set(auth(coach)).send({ clientId: other.id, planId: copy.id });
    expect(reassigned.status).toBe(404);
  });

  it("returns an existing copy as it is, and refuses a removed plan or another coach", async () => {
    const { coach, assignmentId } = await coachedClient("custom-again");
    const stranger = await user("COACH", "custom-stranger");

    const first = await api.post(`/v1/coach/assignments/${assignmentId}/customize`).set(auth(coach));
    const second = await api.post(`/v1/coach/assignments/${assignmentId}/customize`).set(auth(coach));
    expect(second.body.assignment.plan.id).toBe(first.body.assignment.plan.id);

    expect((await api.post(`/v1/coach/assignments/${assignmentId}/customize`).set(auth(stranger))).status).toBe(403);
    await api.delete(`/v1/coach/assignments/${assignmentId}`).set(auth(coach));
    expect((await api.post(`/v1/coach/assignments/${assignmentId}/customize`).set(auth(coach))).status).toBe(409);
  });

  it("keeps the client's check-ins on the assignment", async () => {
    const { coach, client, assignmentId } = await coachedClient("custom-history");
    await api.post("/v1/tracking/checkin").set(auth(client)).send({ assignmentId, date: dateKey(0), completedItemIds: ["push-up"] });

    await api.post(`/v1/coach/assignments/${assignmentId}/customize`).set(auth(coach));

    const checkIns = await api.get(`/v1/coach/clients/${client.id}/checkins?from=${dateKey(-1)}&to=${dateKey(1)}`).set(auth(coach));
    expect(checkIns.body.checkIns).toEqual([expect.objectContaining({ assignmentId, completedItemIds: ["push-up"] })]);
  });
});

describe("check-in notifications to the coach", () => {
  beforeEach(() => sent.mockClear());

  it("sends one push when a day is first logged, and stays quiet as more is ticked off", async () => {
    const { coach, client, assignmentId } = await coachedClient("notify-log");
    const token = await withToken(coach);
    const save = (completedItemIds: string[]) =>
      api.post("/v1/tracking/checkin").set(auth(client)).send({ assignmentId, date: dateKey(0), completedItemIds });

    await save([]);
    await save(["push-up"]);
    await save(["push-up"]);

    await vi.waitFor(() => {
      expect(messagesTo(token)).toEqual([
        expect.objectContaining({ title: expect.stringContaining("checked in"), data: { url: `/clients/${client.id}` } }),
      ]);
    });
  });

  it("sends a push for a new comment, but not for an edit to one", async () => {
    const { coach, client } = await coachedClient("notify-comment");
    const diet = await api.post("/v1/coach/plans").set(auth(coach)).send({ type: "DIET", title: "Diet", content: VALID_DIET_CONTENT });
    const assigned = await api.post("/v1/coach/assignments").set(auth(coach)).send({ clientId: client.id, planId: diet.body.plan.id });
    const token = await withToken(coach);
    const save = (note: string) =>
      api
        .post("/v1/tracking/checkin")
        .set(auth(client))
        .send({ assignmentId: assigned.body.assignment.id, date: dateKey(0), completedItemIds: [], itemNotes: { breakfast: note } });

    await save("Too salty");
    await save("Too salty, skipped half");

    await vi.waitFor(() => {
      expect(messagesTo(token)).toEqual([
        expect.objectContaining({ title: "New comment", body: expect.not.stringContaining("salty") }),
      ]);
    });
  });

  it("stays quiet for days logged long after the fact", async () => {
    const { coach, client, assignmentId } = await coachedClient("notify-old", dateKey(-20));
    const token = await withToken(coach);

    await api.post("/v1/tracking/checkin").set(auth(client)).send({ assignmentId, date: dateKey(-10), completedItemIds: ["push-up"] });

    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(messagesTo(token)).toEqual([]);
  });
});

describe("roster attention", () => {
  it("flags a client with no plan", async () => {
    const coach = await user("COACH", "attn-noplan-coach");
    const client = await user("CLIENT", "attn-noplan-client");
    await createAcceptedInvite(coach, client);

    expect(await rosterEntry(coach, client.id)).toMatchObject({ attention: ["NO_PLAN"], lastCheckInDate: null });
  });

  it("flags a client gone quiet on an active plan, and clears it once they log", async () => {
    const { coach, client, assignmentId } = await coachedClient("attn-quiet", dateKey(-5));
    expect((await rosterEntry(coach, client.id))?.attention).toEqual(["QUIET"]);

    await api.post("/v1/tracking/checkin").set(auth(client)).send({ assignmentId, date: dateKey(0), completedItemIds: ["push-up"] });

    expect(await rosterEntry(coach, client.id)).toMatchObject({ attention: [], lastCheckInDate: dateKey(0) });
  });

  it("doesn't flag a plan assigned today, and ignores check-ins with nothing ticked off", async () => {
    const { coach, client, assignmentId } = await coachedClient("attn-fresh");
    await api.post("/v1/tracking/checkin").set(auth(client)).send({ assignmentId, date: dateKey(0), completedItemIds: [] });

    expect(await rosterEntry(coach, client.id)).toMatchObject({ attention: [], lastCheckInDate: null });
  });

  it("flags a renewal coming up and an expired subscription", async () => {
    const { coach, client } = await coachedClient("attn-renew");
    const subscription = await api
      .post(`/v1/coach/clients/${client.id}/subscriptions`)
      .set(auth(coach))
      .send({ startDate: dateKey(-20), endDate: dateKey(3) });
    expect(subscription.status).toBe(201);
    expect((await rosterEntry(coach, client.id))?.attention).toEqual(["RENEWAL_DUE"]);

    await prisma.subscription.update({ where: { id: subscription.body.subscription.id }, data: { endDate: new Date(`${dateKey(-1)}T00:00:00.000Z`) } });
    expect((await rosterEntry(coach, client.id))?.attention).toEqual(["EXPIRED"]);
  });
});
