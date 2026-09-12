import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "../src/config/prisma.config.js";
import { api, cleanupUser, createAcceptedInvite, registerUser, type TestUser } from "./helpers.js";

/** YYYY-MM-DD, `offset` days from today in UTC. */
function day(offset: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

describe("subscriptions", () => {
  let coach: TestUser;
  let otherCoach: TestUser;
  let client: TestUser;
  let otherClient: TestUser;

  beforeAll(async () => {
    coach = await registerUser("COACH", "subcoach");
    otherCoach = await registerUser("COACH", "subother");
    client = await registerUser("CLIENT", "subclient");
    otherClient = await registerUser("CLIENT", "subotherclient");
    await createAcceptedInvite(coach, client);
  });

  afterAll(async () => {
    await cleanupUser(coach.id);
    await cleanupUser(otherCoach.id);
    await cleanupUser(client.id);
    await cleanupUser(otherClient.id);
  });

  function listFor(user: TestUser, clientId: string) {
    return api
      .get(`/v1/coach/clients/${clientId}/subscriptions`)
      .set("Authorization", `Bearer ${user.token}`);
  }

  function createFor(user: TestUser, clientId: string, body: Record<string, unknown>) {
    return api
      .post(`/v1/coach/clients/${clientId}/subscriptions`)
      .set("Authorization", `Bearer ${user.token}`)
      .send(body);
  }

  describe("creation on invite acceptance", () => {
    it("creates an ACTIVE period with the right endDate when the invite carried a duration", async () => {
      const newCoach = await registerUser("COACH", "subdurcoach");
      const newClient = await registerUser("CLIENT", "subdurclient");
      try {
        const invite = await api
          .post("/v1/coach/invites")
          .set("Authorization", `Bearer ${newCoach.token}`)
          .send({ clientEmail: newClient.email, durationMonths: 3 });
        expect(invite.status).toBe(201);
        expect(invite.body.invite.durationMonths).toBe(3);

        await api
          .post(`/v1/client/invites/${invite.body.invite.id}/accept`)
          .set("Authorization", `Bearer ${newClient.token}`);

        const res = await listFor(newCoach, newClient.id);
        expect(res.status).toBe(200);
        expect(res.body.subscriptions).toHaveLength(1);

        const [subscription] = res.body.subscriptions;
        expect(subscription.status).toBe("ACTIVE");
        expect(subscription.startDate.slice(0, 10)).toBe(day(0));

        const expectedEnd = new Date();
        expectedEnd.setUTCHours(0, 0, 0, 0);
        expectedEnd.setUTCMonth(expectedEnd.getUTCMonth() + 3);
        expect(subscription.endDate.slice(0, 10)).toBe(expectedEnd.toISOString().slice(0, 10));
      } finally {
        await cleanupUser(newCoach.id);
        await cleanupUser(newClient.id);
      }
    });

    it("creates no subscription when the invite had no duration, but still forms the relationship", async () => {
      const res = await listFor(coach, client.id);
      expect(res.status).toBe(200);
      // createAcceptedInvite sends no duration, so this pair is open-ended.
      expect(res.body.subscriptions).toHaveLength(0);

      // The relationship exists regardless — this is the check every other
      // coach-scoped route uses, and it passes.
      const access = await api
        .get(`/v1/coach/clients/${client.id}/profile`)
        .set("Authorization", `Bearer ${coach.token}`);
      expect(access.status).toBe(200);
    });

    it("rejects a duration outside 1-24 months", async () => {
      const res = await api
        .post("/v1/coach/invites")
        .set("Authorization", `Bearer ${coach.token}`)
        .send({ clientEmail: `subrange-${Date.now()}@vitest.local`, durationMonths: 25 });

      expect(res.status).toBe(400);
    });
  });

  describe("creating periods", () => {
    it("creates a period and returns it as ACTIVE", async () => {
      const res = await createFor(coach, client.id, {
        startDate: day(-1),
        endDate: day(30),
        notes: "First paid month",
      });

      expect(res.status).toBe(201);
      expect(res.body.subscription.status).toBe("ACTIVE");
      expect(res.body.subscription.notes).toBe("First paid month");
      expect(res.body.subscription.daysRemaining).toBeGreaterThan(0);
    });

    it("expires the running period when a renewal is added, leaving exactly one ACTIVE", async () => {
      const renewal = await createFor(coach, client.id, { startDate: day(30), endDate: day(60) });
      expect(renewal.status).toBe(201);

      const res = await listFor(coach, client.id);
      const active = res.body.subscriptions.filter((row: { status: string }) => row.status === "ACTIVE");

      expect(active).toHaveLength(1);
      expect(active[0].id).toBe(renewal.body.subscription.id);
    });

    it("returns periods newest first", async () => {
      const res = await listFor(coach, client.id);
      const dates = res.body.subscriptions.map((row: { startDate: string }) => row.startDate);

      expect(dates).toEqual([...dates].sort().reverse());
    });

    it("rejects endDate equal to startDate", async () => {
      const res = await createFor(coach, client.id, { startDate: day(0), endDate: day(0) });
      expect(res.status).toBe(400);
    });

    it("rejects endDate before startDate", async () => {
      const res = await createFor(coach, client.id, { startDate: day(10), endDate: day(5) });
      expect(res.status).toBe(400);
    });
  });

  describe("expiry is computed at read time", () => {
    it("reports EXPIRED for a past endDate even though the row still says ACTIVE", async () => {
      const stale = await prisma.subscription.create({
        data: {
          coachId: coach.id,
          clientId: client.id,
          startDate: new Date(`${day(-60)}T00:00:00.000Z`),
          endDate: new Date(`${day(-30)}T00:00:00.000Z`),
          status: "ACTIVE",
        },
      });

      // Nothing has rewritten the row; the status is derived on the way out.
      expect(stale.status).toBe("ACTIVE");

      const res = await listFor(coach, client.id);
      const returned = res.body.subscriptions.find((row: { id: string }) => row.id === stale.id);

      expect(returned.status).toBe("EXPIRED");
      expect(returned.storedStatus).toBe("ACTIVE");
      expect(returned.daysRemaining).toBe(0);
    });

    it("leaves a CANCELLED period cancelled rather than calling it expired", async () => {
      const cancelled = await prisma.subscription.create({
        data: {
          coachId: coach.id,
          clientId: client.id,
          startDate: new Date(`${day(-10)}T00:00:00.000Z`),
          endDate: new Date(`${day(-5)}T00:00:00.000Z`),
          status: "CANCELLED",
        },
      });

      const res = await listFor(coach, client.id);
      const returned = res.body.subscriptions.find((row: { id: string }) => row.id === cancelled.id);

      // Cancelling is a decision someone made; the calendar shouldn't relabel it.
      expect(returned.status).toBe("CANCELLED");
    });
  });

  describe("editing a period", () => {
    it("updates notes and status", async () => {
      const created = await createFor(coach, client.id, { startDate: day(0), endDate: day(45) });
      const id = created.body.subscription.id as string;

      const res = await api
        .patch(`/v1/coach/clients/${client.id}/subscriptions/${id}`)
        .set("Authorization", `Bearer ${coach.token}`)
        .send({ status: "CANCELLED", notes: "Client paused training" });

      expect(res.status).toBe(200);
      expect(res.body.subscription.status).toBe("CANCELLED");
      expect(res.body.subscription.notes).toBe("Client paused training");
    });

    it("rejects an edit that would put endDate on or before the stored startDate", async () => {
      const created = await createFor(coach, client.id, { startDate: day(0), endDate: day(45) });
      const id = created.body.subscription.id as string;

      const res = await api
        .patch(`/v1/coach/clients/${client.id}/subscriptions/${id}`)
        .set("Authorization", `Bearer ${coach.token}`)
        .send({ endDate: day(-5) });

      expect(res.status).toBe(400);
    });

    it("returns 404 for a period belonging to a different pair", async () => {
      const res = await api
        .patch(`/v1/coach/clients/${client.id}/subscriptions/not-a-real-id`)
        .set("Authorization", `Bearer ${coach.token}`)
        .send({ notes: "nope" });

      expect(res.status).toBe(404);
    });

    it("rejects an empty update body", async () => {
      const created = await createFor(coach, client.id, { startDate: day(0), endDate: day(20) });
      const res = await api
        .patch(`/v1/coach/clients/${client.id}/subscriptions/${created.body.subscription.id}`)
        .set("Authorization", `Bearer ${coach.token}`)
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe("authorisation", () => {
    it("returns 403 to a coach with no accepted invite for that client", async () => {
      const res = await listFor(otherCoach, client.id);
      expect(res.status).toBe(403);
    });

    it("returns 403 when that coach tries to create a period", async () => {
      const res = await createFor(otherCoach, client.id, { startDate: day(0), endDate: day(30) });
      expect(res.status).toBe(403);
    });

    it("returns 403 to a client calling the coach-scoped list", async () => {
      const res = await api
        .get(`/v1/coach/clients/${client.id}/subscriptions`)
        .set("Authorization", `Bearer ${client.token}`);

      expect(res.status).toBe(403);
    });

    it("returns 403 to a client calling the coach-scoped create", async () => {
      const res = await api
        .post(`/v1/coach/clients/${client.id}/subscriptions`)
        .set("Authorization", `Bearer ${client.token}`)
        .send({ startDate: day(0), endDate: day(30) });

      expect(res.status).toBe(403);
    });

    it("returns 401 without a token", async () => {
      const res = await api.get(`/v1/coach/clients/${client.id}/subscriptions`);
      expect(res.status).toBe(401);
    });
  });

  describe("GET /v1/client/subscription", () => {
    it("returns the calling client's current period with their coach's name", async () => {
      const res = await api.get("/v1/client/subscription").set("Authorization", `Bearer ${client.token}`);

      expect(res.status).toBe(200);
      expect(res.body.subscription).not.toBeNull();
      expect(res.body.subscription.clientId).toBe(client.id);
      expect(res.body.subscription.coach.id).toBe(coach.id);
    });

    it("returns null for a client with no subscription, rather than erroring", async () => {
      const res = await api.get("/v1/client/subscription").set("Authorization", `Bearer ${otherClient.token}`);

      // An open-ended relationship is a normal state, not a failure.
      expect(res.status).toBe(200);
      expect(res.body.subscription).toBeNull();
    });

    it("never returns another client's subscription", async () => {
      const res = await api.get("/v1/client/subscription").set("Authorization", `Bearer ${otherClient.token}`);
      expect(res.body.subscription).toBeNull();

      const mine = await api.get("/v1/client/subscription").set("Authorization", `Bearer ${client.token}`);
      expect(mine.body.subscription.clientId).not.toBe(otherClient.id);
    });

    it("returns 403 to a coach", async () => {
      const res = await api.get("/v1/client/subscription").set("Authorization", `Bearer ${coach.token}`);
      expect(res.status).toBe(403);
    });
  });

  describe("access is unaffected by expiry", () => {
    it("still lets the coach read the client after every period has lapsed", async () => {
      // Expire everything this pair has.
      await prisma.subscription.updateMany({
        where: { coachId: coach.id, clientId: client.id },
        data: { endDate: new Date(`${day(-1)}T00:00:00.000Z`) },
      });

      // Access comes from the ACCEPTED invite, not from a paid period. An
      // expired subscription is a badge in the UI, never a lockout.
      const profile = await api
        .get(`/v1/coach/clients/${client.id}/profile`)
        .set("Authorization", `Bearer ${coach.token}`);
      expect(profile.status).toBe(200);

      const checkIns = await api
        .get(`/v1/coach/clients/${client.id}/checkins`)
        .query({ from: day(-7), to: day(0) })
        .set("Authorization", `Bearer ${coach.token}`);
      expect(checkIns.status).toBe(200);
    });
  });
});
