import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { api, cleanupUser, createAcceptedInvite, registerUser, type TestUser } from "./helpers.js";

function auth(user: TestUser) {
  return { Authorization: `Bearer ${user.token}` };
}

const CLIENT_PHONE = "919800000001";
const COACH_PHONE = "919800000002";
const STRANGER_COACH_PHONE = "919800000003";

/**
 * A phone number is shared only inside an established relationship: the coach
 * and client of an ACCEPTED invite see each other's, and nobody else does.
 */
describe("phone numbers between coach and client", () => {
  let coach: TestUser;
  let strangerCoach: TestUser;
  let client: TestUser;

  beforeAll(async () => {
    coach = await registerUser("COACH", "phcoach");
    strangerCoach = await registerUser("COACH", "phstranger");
    client = await registerUser("CLIENT", "phclient");

    await api.patch("/v1/client/profile").set(auth(client)).send({ phone: CLIENT_PHONE });
    await api.patch("/v1/coach/profile").set(auth(coach)).send({ phone: COACH_PHONE });
    await api.patch("/v1/coach/profile").set(auth(strangerCoach)).send({ phone: STRANGER_COACH_PHONE });

    await createAcceptedInvite(coach, client);
    // Only pending: an invite the client hasn't answered is not a relationship.
    const pending = await api.post("/v1/coach/invites").set(auth(strangerCoach)).send({ clientEmail: client.email });
    if (pending.status !== 201) throw new Error(`Failed to create pending invite: ${pending.status}`);
  });

  afterAll(async () => {
    for (const user of [coach, strangerCoach, client]) await cleanupUser(user.id);
  });

  it("gives a coach with an accepted invite the client's phone", async () => {
    const res = await api.get(`/v1/coach/clients/${client.id}/profile`).set(auth(coach));
    expect(res.status).toBe(200);
    expect(res.body.profile.phone).toBe(CLIENT_PHONE);
  });

  it("gives a coach without an accepted invite nothing, even with a pending one", async () => {
    const res = await api.get(`/v1/coach/clients/${client.id}/profile`).set(auth(strangerCoach));
    expect(res.status).toBe(403);
    expect(JSON.stringify(res.body)).not.toContain(CLIENT_PHONE);
  });

  it("gives the client their accepted coach's phone for My Coach", async () => {
    const res = await api.get("/v1/client/invites").query({ status: "ACCEPTED" }).set(auth(client));
    expect(res.status).toBe(200);
    const invite = res.body.invites.find((row: { coachId: string }) => row.coachId === coach.id);
    expect(invite.coach).toMatchObject({ id: coach.id, phone: COACH_PHONE });
  });

  it("returns null, not a missing field, when the accepted coach has no phone", async () => {
    const quietCoach = await registerUser("COACH", "phquiet");
    try {
      await createAcceptedInvite(quietCoach, client);
      const res = await api.get("/v1/client/invites").query({ status: "ACCEPTED" }).set(auth(client));
      const invite = res.body.invites.find((row: { coachId: string }) => row.coachId === quietCoach.id);
      expect(invite.coach.phone).toBeNull();
    } finally {
      await cleanupUser(quietCoach.id);
    }
  });

  it("keeps a coach's phone off an invite the client hasn't accepted", async () => {
    const res = await api.get("/v1/client/invites").query({ status: "PENDING" }).set(auth(client));
    expect(res.status).toBe(200);
    const invite = res.body.invites.find((row: { coachId: string }) => row.coachId === strangerCoach.id);
    expect(invite.coach).toMatchObject({ id: strangerCoach.id });
    expect(invite.coach).not.toHaveProperty("phone");
    expect(JSON.stringify(res.body)).not.toContain(STRANGER_COACH_PHONE);
  });

  it("keeps a coach's phone off a declined invite too", async () => {
    const [pending] = (await api.get("/v1/client/invites").query({ status: "PENDING" }).set(auth(client))).body.invites;
    await api.post(`/v1/client/invites/${pending.id}/decline`).set(auth(client));

    const res = await api.get("/v1/client/invites").query({ status: "DECLINED" }).set(auth(client));
    expect(res.body.invites.length).toBeGreaterThan(0);
    expect(JSON.stringify(res.body)).not.toContain(STRANGER_COACH_PHONE);
  });
});
