import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "../src/config/prisma.config.js";
import { api, cleanupUser, createAcceptedInvite, registerUser, type TestUser } from "./helpers.js";

function auth(user: TestUser) {
  return { Authorization: `Bearer ${user.token}` };
}

function daysFromToday(days: number): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + days));
}

type CountedCoach = { id: string; activeClientCount: number; totalClientCount: number };

/**
 * total  = every client with an ACCEPTED invite, counted once each.
 * active = those whose latest subscription with the coach is still running,
 *          plus those with no subscription at all (open-ended).
 */
describe("Explore client counts", () => {
  let coach: TestUser;
  let emptyCoach: TestUser;
  let browsing: TestUser;
  const clients: Record<string, TestUser> = {};

  beforeAll(async () => {
    coach = await registerUser("COACH", "cntcoach");
    emptyCoach = await registerUser("COACH", "cntempty");
    browsing = await registerUser("CLIENT", "cntbrowse");
    for (const key of ["openEnded", "active", "expired", "cancelled", "renewed", "pending"]) {
      clients[key] = await registerUser("CLIENT", `cnt${key.toLowerCase()}`);
    }
    for (const listed of [coach, emptyCoach]) {
      await api.patch("/v1/coach/profile").set(auth(listed)).send({ listedInExplore: true, phone: "919800000009" });
    }

    for (const key of ["openEnded", "active", "expired", "cancelled", "renewed"]) {
      await createAcceptedInvite(coach, clients[key]!);
    }
    const pending = await api.post("/v1/coach/invites").set(auth(coach)).send({ clientEmail: clients.pending!.email });
    if (pending.status !== 201) throw new Error(`Failed to invite: ${pending.status}`);

    const period = (clientKey: string, start: number, end: number, status: "ACTIVE" | "EXPIRED" | "CANCELLED" = "ACTIVE") =>
      prisma.subscription.create({
        data: {
          coachId: coach.id,
          clientId: clients[clientKey]!.id,
          startDate: daysFromToday(start),
          endDate: daysFromToday(end),
          status,
        },
      });
    await period("active", -10, 20);
    // Still says ACTIVE in the row, but its end date has passed: expiry is derived.
    await period("expired", -60, -30);
    await period("cancelled", -10, 20, "CANCELLED");
    // An old lapsed period followed by a current one: the current one decides.
    await period("renewed", -90, -60, "EXPIRED");
    await period("renewed", -5, 25);
    // A second accepted invite for the same client must not count them twice.
    await prisma.coachClientInvite.create({
      data: {
        coachId: coach.id,
        clientId: clients.openEnded!.id,
        clientEmail: clients.openEnded!.email,
        status: "ACCEPTED",
        respondedAt: new Date(),
      },
    });
  });

  afterAll(async () => {
    for (const user of [coach, emptyCoach, browsing, ...Object.values(clients)]) await cleanupUser(user.id);
  });

  it("counts active and all-time clients on the directory list", async () => {
    const res = await api.get("/v1/client/coaches").set(auth(browsing));
    expect(res.status).toBe(200);
    const listed = (res.body.coaches as CountedCoach[]).find((row) => row.id === coach.id);
    // openEnded, active, renewed are running; expired and cancelled are not; pending was never accepted.
    expect(listed).toMatchObject({ activeClientCount: 3, totalClientCount: 5 });
  });

  it("reports the same counts on the profile", async () => {
    const res = await api.get(`/v1/client/coaches/${coach.id}`).set(auth(browsing));
    expect(res.body.coach).toMatchObject({ activeClientCount: 3, totalClientCount: 5 });
  });

  it("sends zero, not a missing field, for a coach with no clients", async () => {
    const res = await api.get(`/v1/client/coaches/${emptyCoach.id}`).set(auth(browsing));
    expect(res.body.coach).toMatchObject({ activeClientCount: 0, totalClientCount: 0 });
  });

  it("still leaves out contact details", async () => {
    const res = await api.get("/v1/client/coaches").set(auth(browsing));
    for (const row of res.body.coaches) {
      expect(row).not.toHaveProperty("phone");
      expect(row).not.toHaveProperty("email");
    }
    expect(JSON.stringify(res.body)).not.toContain("919800000009");
  });
});
