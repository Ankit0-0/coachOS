import { afterEach, describe, expect, it } from "vitest";

import { prisma } from "../src/config/prisma.config.js";
import {
  api,
  cleanupUser,
  createAcceptedInvite,
  registerUser,
  VALID_WORKOUT_CONTENT,
  type TestUser,
} from "./helpers.js";

function auth(user: TestUser) {
  return { Authorization: `Bearer ${user.token}` };
}

/** YYYY-MM-DD for today (UTC, as the API reads dates) plus `offset` days. */
function day(offset: number): string {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

let created: TestUser[] = [];

async function user(role: "COACH" | "CLIENT", prefix: string): Promise<TestUser> {
  const registered = await registerUser(role, prefix);
  created.push(registered);
  return registered;
}

afterEach(async () => {
  for (const each of created) await cleanupUser(each.id);
  created = [];
});

/**
 * The first coach's full relationship: an accepted invite with a period, an
 * active plan, a check-in on it and a weigh-in. Returns the assignment id.
 */
async function establishFirstCoach(coach: TestUser, client: TestUser): Promise<string> {
  const invite = await api
    .post("/v1/coach/invites")
    .set(auth(coach))
    .send({ clientEmail: client.email, subscriptionStartDate: day(-10), subscriptionEndDate: day(60) });
  expect(invite.status).toBe(201);
  expect((await api.post(`/v1/client/invites/${invite.body.invite.id}/accept`).set(auth(client))).status).toBe(200);

  const plan = await api
    .post("/v1/coach/plans")
    .set(auth(coach))
    .send({ type: "WORKOUT", title: "First coach plan", cycleLengthDays: 1, content: VALID_WORKOUT_CONTENT });
  const assignment = await api
    .post("/v1/coach/assignments")
    .set(auth(coach))
    .send({ clientId: client.id, planId: plan.body.plan.id, startDate: day(-7) });
  expect(assignment.status).toBe(201);
  const assignmentId = assignment.body.assignment.id as string;

  const checkIn = await api
    .post("/v1/tracking/checkin")
    .set(auth(client))
    .send({ assignmentId, date: day(-2), completedItemIds: ["push-up-set1"], notes: "felt good" });
  expect(checkIn.status).toBe(200);
  expect((await api.post("/v1/tracking/weight").set(auth(client)).send({ date: day(-2), weightKg: 72.5 })).status).toBe(200);
  return assignmentId;
}

/** Every coach-scoped route that reads or acts on this client's data. */
async function coachAccessStatuses(coach: TestUser, client: TestUser, assignmentId: string) {
  const range = `from=${day(-30)}&to=${day(0)}`;
  return {
    profile: (await api.get(`/v1/coach/clients/${client.id}/profile`).set(auth(coach))).status,
    plans: (await api.get(`/v1/coach/assignments?clientId=${client.id}`).set(auth(coach))).status,
    checkIns: (await api.get(`/v1/coach/clients/${client.id}/checkins?${range}`).set(auth(coach))).status,
    // Photos ride on check-ins and weigh-ins; there is no separate photo route.
    weight: (await api.get(`/v1/coach/clients/${client.id}/weight?${range}`).set(auth(coach))).status,
    schedule: (await api.get(`/v1/coach/clients/${client.id}/schedule?${range}`).set(auth(coach))).status,
    subscriptions: (await api.get(`/v1/coach/clients/${client.id}/subscriptions`).set(auth(coach))).status,
    cancelPlan: (await api.delete(`/v1/coach/assignments/${assignmentId}`).set(auth(coach))).status,
  };
}

async function expectPreviousCoachEnded(oldCoach: TestUser, newCoach: TestUser, client: TestUser, assignmentId: string) {
  const invites = await prisma.coachClientInvite.findMany({ where: { clientId: client.id } });
  expect(invites.find((row) => row.coachId === oldCoach.id)?.status).toBe("ENDED");
  expect(invites.find((row) => row.coachId === newCoach.id)?.status).toBe("ACCEPTED");

  const assignment = await prisma.planAssignment.findUniqueOrThrow({ where: { id: assignmentId } });
  expect(assignment.status).toBe("CANCELLED");

  const oldSubscriptions = await prisma.subscription.findMany({ where: { clientId: client.id, coachId: oldCoach.id } });
  expect(oldSubscriptions.map((row) => row.status)).toEqual(["CANCELLED"]);

  // History survives: nothing was deleted.
  expect(await prisma.checkIn.count({ where: { assignmentId } })).toBe(1);
  expect(await prisma.weightEntry.count({ where: { clientId: client.id } })).toBe(1);
}

describe("one active coach per client", () => {
  it("accepting a second coach's invite ends the first relationship in full", async () => {
    const oldCoach = await user("COACH", "switcholdcoach");
    const newCoach = await user("COACH", "switchnewcoach");
    const client = await user("CLIENT", "switchclient");
    const assignmentId = await establishFirstCoach(oldCoach, client);

    await createAcceptedInvite(newCoach, client);

    await expectPreviousCoachEnded(oldCoach, newCoach, client, assignmentId);
    expect(await coachAccessStatuses(oldCoach, client, assignmentId)).toEqual({
      profile: 403,
      plans: 403,
      checkIns: 403,
      weight: 403,
      schedule: 403,
      subscriptions: 403,
      cancelPlan: 403,
    });
    expect((await api.get(`/v1/coach/clients/${client.id}/profile`).set(auth(newCoach))).status).toBe(200);
  });

  it("does the same when the switch happens through a coach request", async () => {
    const oldCoach = await user("COACH", "reqoldcoach");
    const newCoach = await user("COACH", "reqnewcoach");
    const client = await user("CLIENT", "reqclient");
    const assignmentId = await establishFirstCoach(oldCoach, client);

    await api.patch("/v1/coach/profile").set(auth(newCoach)).send({ listedInExplore: true });
    const request = await api.post("/v1/client/coach-requests").set(auth(client)).send({ coachId: newCoach.id });
    expect(request.status).toBe(201);
    const accepted = await api
      .post(`/v1/coach/coach-requests/${request.body.request.id}/accept`)
      .set(auth(newCoach))
      .send({ subscriptionStartDate: day(0), subscriptionEndDate: day(90) });
    expect(accepted.status).toBe(200);

    await expectPreviousCoachEnded(oldCoach, newCoach, client, assignmentId);
    const statuses = await coachAccessStatuses(oldCoach, client, assignmentId);
    expect(Object.values(statuses).every((status) => status === 403)).toBe(true);

    const newSubscriptions = await prisma.subscription.findMany({ where: { clientId: client.id, coachId: newCoach.id } });
    expect(newSubscriptions).toHaveLength(1);
    expect(newSubscriptions[0]!.startDate.toISOString().slice(0, 10)).toBe(day(0));
    expect(newSubscriptions[0]!.endDate.toISOString().slice(0, 10)).toBe(day(90));
  });

  it("ends a previous relationship that was formed through a request", async () => {
    const oldCoach = await user("COACH", "reqfirstcoach");
    const newCoach = await user("COACH", "reqsecondcoach");
    const client = await user("CLIENT", "reqfirstclient");

    await api.patch("/v1/coach/profile").set(auth(oldCoach)).send({ listedInExplore: true });
    const request = await api.post("/v1/client/coach-requests").set(auth(client)).send({ coachId: oldCoach.id });
    await api.post(`/v1/coach/coach-requests/${request.body.request.id}/accept`).set(auth(oldCoach));

    await createAcceptedInvite(newCoach, client);

    const row = await prisma.coachRequest.findUniqueOrThrow({ where: { id: request.body.request.id } });
    expect(row.status).toBe("ENDED");
    expect((await api.get(`/v1/coach/clients/${client.id}/profile`).set(auth(oldCoach))).status).toBe(403);
  });

  it("tells the client who they'd be leaving, on the pending invite itself", async () => {
    const oldCoach = await user("COACH", "warnoldcoach");
    const newCoach = await user("COACH", "warnnewcoach");
    const client = await user("CLIENT", "warnclient");
    await establishFirstCoach(oldCoach, client);

    await api.post("/v1/coach/invites").set(auth(newCoach)).send({ clientEmail: client.email });
    const pending = await api.get("/v1/client/invites?status=PENDING").set(auth(client));
    expect(pending.status).toBe(200);
    expect(pending.body.invites[0].currentCoach).toEqual({ id: oldCoach.id, name: "warnoldcoach Test", hasActivePlan: true });
  });

  it("reports no current coach to a client who has none", async () => {
    const coach = await user("COACH", "warnnonecoach");
    const client = await user("CLIENT", "warnnoneclient");
    await api.post("/v1/coach/invites").set(auth(coach)).send({ clientEmail: client.email });

    const pending = await api.get("/v1/client/invites?status=PENDING").set(auth(client));
    expect(pending.body.invites[0].currentCoach).toBeNull();
  });

  it("tells the client on a coach's Explore page who a request would replace", async () => {
    const oldCoach = await user("COACH", "exploreold");
    const newCoach = await user("COACH", "explorenew");
    const client = await user("CLIENT", "exploreclient");
    await createAcceptedInvite(oldCoach, client);
    await api.patch("/v1/coach/profile").set(auth(newCoach)).send({ listedInExplore: true });

    const res = await api.get(`/v1/client/coaches/${newCoach.id}`).set(auth(client));
    expect(res.status).toBe(200);
    expect(res.body.coach.currentCoach).toMatchObject({ id: oldCoach.id, hasActivePlan: false });
  });
});

describe("subscription dates on invites", () => {
  it("keeps the coach's start date when the client accepts late", async () => {
    const coach = await user("COACH", "latecoach");
    const client = await user("CLIENT", "lateclient");
    const invite = await api
      .post("/v1/coach/invites")
      .set(auth(coach))
      .send({ clientEmail: client.email, subscriptionStartDate: day(-5), subscriptionEndDate: day(85) });
    expect(invite.body.invite.subscriptionPeriod.startDate.slice(0, 10)).toBe(day(-5));

    expect((await api.post(`/v1/client/invites/${invite.body.invite.id}/accept`).set(auth(client))).status).toBe(200);
    const [subscription] = await prisma.subscription.findMany({ where: { coachId: coach.id, clientId: client.id } });
    expect(subscription!.startDate.toISOString().slice(0, 10)).toBe(day(-5));
    expect(subscription!.endDate.toISOString().slice(0, 10)).toBe(day(85));
  });

  it("refuses an invite accepted after its end date, and leaves it pending", async () => {
    const coach = await user("COACH", "expiredcoach");
    const client = await user("CLIENT", "expiredclient");
    const invite = await api
      .post("/v1/coach/invites")
      .set(auth(coach))
      .send({ clientEmail: client.email, subscriptionStartDate: day(-3), subscriptionEndDate: day(1) });
    // The period runs out while the invite sits unanswered.
    await prisma.coachClientInvite.update({
      where: { id: invite.body.invite.id },
      data: { subscriptionEndDate: new Date(`${day(-1)}T00:00:00.000Z`) },
    });

    const res = await api.post(`/v1/client/invites/${invite.body.invite.id}/accept`).set(auth(client));
    expect(res.status).toBe(410);
    const row = await prisma.coachClientInvite.findUniqueOrThrow({ where: { id: invite.body.invite.id } });
    expect(row.status).toBe("PENDING");
    expect(await prisma.subscription.count({ where: { clientId: client.id } })).toBe(0);
  });

  it("still accepts on the period's last day", async () => {
    const coach = await user("COACH", "lastdaycoach");
    const client = await user("CLIENT", "lastdayclient");
    const invite = await api
      .post("/v1/coach/invites")
      .set(auth(coach))
      .send({ clientEmail: client.email, subscriptionStartDate: day(-30), subscriptionEndDate: day(0) });
    expect((await api.post(`/v1/client/invites/${invite.body.invite.id}/accept`).set(auth(client))).status).toBe(200);
  });

  it.each([
    ["an end date equal to the start", { subscriptionStartDate: day(10), subscriptionEndDate: day(10) }],
    ["an end date before the start", { subscriptionStartDate: day(10), subscriptionEndDate: day(5) }],
    ["a start date without an end", { subscriptionStartDate: day(0) }],
    ["an end date already past", { subscriptionStartDate: day(-40), subscriptionEndDate: day(-1) }],
    ["dates and a legacy length together", { subscriptionStartDate: day(0), subscriptionEndDate: day(30), durationMonths: 1 }],
  ])("rejects %s at invite time", async (_label, period) => {
    const coach = await user("COACH", "rangecoach");
    const res = await api
      .post("/v1/coach/invites")
      .set(auth(coach))
      .send({ clientEmail: `range-${Date.now()}@vitest.local`, ...period });
    expect(res.status).toBe(400);
  });

  it("rejects an already-past end date when a coach accepts a request", async () => {
    const coach = await user("COACH", "reqrangecoach");
    const client = await user("CLIENT", "reqrangeclient");
    await api.patch("/v1/coach/profile").set(auth(coach)).send({ listedInExplore: true });
    const request = await api.post("/v1/client/coach-requests").set(auth(client)).send({ coachId: coach.id });

    const res = await api
      .post(`/v1/coach/coach-requests/${request.body.request.id}/accept`)
      .set(auth(coach))
      .send({ subscriptionStartDate: day(-40), subscriptionEndDate: day(-1) });
    expect(res.status).toBe(400);
    const row = await prisma.coachRequest.findUniqueOrThrow({ where: { id: request.body.request.id } });
    expect(row.status).toBe("PENDING");
  });
});
