import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "../src/config/prisma.config.js";
import {
  api,
  cleanupUser,
  registerPendingCoach,
  registerUser,
  type TestUser,
} from "./helpers.js";

function auth(user: TestUser) {
  return { Authorization: `Bearer ${user.token}` };
}

async function listIn(coach: TestUser, listed: boolean) {
  const res = await api.patch("/v1/coach/profile").set(auth(coach)).send({ listedInExplore: listed });
  if (res.status !== 200) throw new Error(`Failed to set listing: ${res.status}`);
}

describe("Explore: coach directory and coaching requests", () => {
  let listedCoach: TestUser;
  let unlistedCoach: TestUser;
  let pendingListedCoach: TestUser;
  let otherListedCoach: TestUser;
  let client: TestUser;
  let otherClient: TestUser;

  beforeAll(async () => {
    listedCoach = await registerUser("COACH", "exlisted");
    unlistedCoach = await registerUser("COACH", "exunlisted");
    pendingListedCoach = await registerPendingCoach("expending");
    otherListedCoach = await registerUser("COACH", "exother");
    client = await registerUser("CLIENT", "exclient");
    otherClient = await registerUser("CLIENT", "exotherclient");

    await api
      .patch("/v1/coach/profile")
      .set(auth(listedCoach))
      .send({ listedInExplore: true, bio: "Strength first.", specialties: ["Strength"], yearsExperience: 6, phone: "555-0100" });
    await listIn(otherListedCoach, true);
    await listIn(pendingListedCoach, true);
  });

  afterAll(async () => {
    for (const user of [listedCoach, unlistedCoach, pendingListedCoach, otherListedCoach, client, otherClient]) {
      await cleanupUser(user.id);
    }
  });

  describe("listing opt-in", () => {
    it("is off by default and round-trips through the coach profile", async () => {
      const fresh = await api.get("/v1/coach/profile").set(auth(unlistedCoach));
      expect(fresh.body.profile.listedInExplore).toBe(false);

      const listed = await api.get("/v1/coach/profile").set(auth(listedCoach));
      expect(listed.body.profile.listedInExplore).toBe(true);
    });

    it("rejects a non-boolean value", async () => {
      const res = await api.patch("/v1/coach/profile").set(auth(listedCoach)).send({ listedInExplore: "yes" });
      expect(res.status).toBe(400);
    });
  });

  describe("GET /v1/client/coaches", () => {
    it("lists opted-in, approved coaches only", async () => {
      const res = await api.get("/v1/client/coaches").set(auth(client));
      expect(res.status).toBe(200);

      const ids = res.body.coaches.map((coach: { id: string }) => coach.id);
      expect(ids).toContain(listedCoach.id);
      expect(ids).toContain(otherListedCoach.id);
      expect(ids).not.toContain(unlistedCoach.id);
      // Opting in doesn't bypass admin approval.
      expect(ids).not.toContain(pendingListedCoach.id);
    });

    it("never includes a phone number in the browse list", async () => {
      const res = await api.get("/v1/client/coaches").set(auth(client));
      expect(res.status).toBe(200);
      expect(res.body.coaches.length).toBeGreaterThan(0);
      for (const coach of res.body.coaches) {
        expect(coach).not.toHaveProperty("phone");
        expect(coach).not.toHaveProperty("email");
      }
      // listedCoach has a phone on file, so this would catch it under any key.
      expect(JSON.stringify(res.body)).not.toContain("555-0100");
    });

    it("shows profile fields but never contact details", async () => {
      const res = await api.get(`/v1/client/coaches/${listedCoach.id}`).set(auth(client));
      expect(res.status).toBe(200);
      expect(res.body.coach).toMatchObject({
        id: listedCoach.id,
        bio: "Strength first.",
        specialties: ["Strength"],
        yearsExperience: 6,
        relationship: "NONE",
        pendingRequestId: null,
      });
      expect(res.body.coach).not.toHaveProperty("email");
      expect(res.body.coach).not.toHaveProperty("phone");
      expect(JSON.stringify(res.body)).not.toContain(listedCoach.email);
      expect(JSON.stringify(res.body)).not.toContain("555-0100");
    });

    it("returns 404 for an unlisted, unapproved or non-coach id", async () => {
      for (const id of [unlistedCoach.id, pendingListedCoach.id, otherClient.id, "no-such-user"]) {
        const res = await api.get(`/v1/client/coaches/${id}`).set(auth(client));
        expect(res.status).toBe(404);
      }
    });

    it("drops a coach from the directory as soon as they opt out", async () => {
      await listIn(otherListedCoach, false);
      const res = await api.get("/v1/client/coaches").set(auth(client));
      expect(res.body.coaches.map((coach: { id: string }) => coach.id)).not.toContain(otherListedCoach.id);
      await listIn(otherListedCoach, true);
    });

    it("is client-only and needs a token", async () => {
      expect((await api.get("/v1/client/coaches").set(auth(listedCoach))).status).toBe(403);
      expect((await api.get("/v1/client/coaches")).status).toBe(401);
    });
  });

  describe("sending and cancelling a request", () => {
    let requestId: string;

    it("creates a pending request and reflects it in the directory", async () => {
      const res = await api
        .post("/v1/client/coach-requests")
        .set(auth(client))
        .send({ coachId: listedCoach.id, message: "  Want to deadlift 2x bodyweight.  " });

      expect(res.status).toBe(201);
      expect(res.body.request).toMatchObject({ coachId: listedCoach.id, clientId: client.id, status: "PENDING" });
      expect(res.body.request.message).toBe("Want to deadlift 2x bodyweight.");
      expect(res.body.request.coach).not.toHaveProperty("email");
      requestId = res.body.request.id;

      const detail = await api.get(`/v1/client/coaches/${listedCoach.id}`).set(auth(client));
      expect(detail.body.coach.relationship).toBe("REQUESTED");
      expect(detail.body.coach.pendingRequestId).toBe(requestId);
    });

    it("rejects a second pending request to the same coach", async () => {
      const res = await api.post("/v1/client/coach-requests").set(auth(client)).send({ coachId: listedCoach.id });
      expect(res.status).toBe(409);
    });

    it("returns 404 when requesting an unlisted or unapproved coach", async () => {
      for (const coachId of [unlistedCoach.id, pendingListedCoach.id]) {
        const res = await api.post("/v1/client/coach-requests").set(auth(client)).send({ coachId });
        expect(res.status).toBe(404);
      }
    });

    it("validates the body, and a coach can't send requests", async () => {
      expect((await api.post("/v1/client/coach-requests").set(auth(client)).send({})).status).toBe(400);
      expect(
        (await api.post("/v1/client/coach-requests").set(auth(client)).send({ coachId: listedCoach.id, message: "x".repeat(501) })).status,
      ).toBe(400);
      expect(
        (await api.post("/v1/client/coach-requests").set(auth(otherListedCoach)).send({ coachId: listedCoach.id })).status,
      ).toBe(403);
    });

    it("lists only the caller's own requests", async () => {
      const mine = await api.get("/v1/client/coach-requests").set(auth(client));
      expect(mine.body.requests.map((request: { id: string }) => request.id)).toContain(requestId);

      const theirs = await api.get("/v1/client/coach-requests").set(auth(otherClient));
      expect(theirs.body.requests).toHaveLength(0);
    });

    it("won't let another client cancel it, and hides that it exists", async () => {
      const res = await api.post(`/v1/client/coach-requests/${requestId}/cancel`).set(auth(otherClient));
      expect(res.status).toBe(404);
    });

    it("cancels, then allows a fresh request", async () => {
      const cancel = await api.post(`/v1/client/coach-requests/${requestId}/cancel`).set(auth(client));
      expect(cancel.status).toBe(200);
      expect(cancel.body.request.status).toBe("CANCELLED");

      const again = await api.post(`/v1/client/coach-requests/${requestId}/cancel`).set(auth(client));
      expect(again.status).toBe(409);

      const detail = await api.get(`/v1/client/coaches/${listedCoach.id}`).set(auth(client));
      expect(detail.body.coach.relationship).toBe("NONE");
    });
  });

  describe("coach responds", () => {
    let requestId: string;

    beforeAll(async () => {
      const res = await api
        .post("/v1/client/coach-requests")
        .set(auth(client))
        .send({ coachId: listedCoach.id, message: "Ready to start." });
      requestId = res.body.request.id;
    });

    it("shows the coach their pending requests with the client's name and email", async () => {
      const res = await api.get("/v1/coach/coach-requests").set(auth(listedCoach));
      expect(res.status).toBe(200);
      const request = res.body.requests.find((row: { id: string }) => row.id === requestId);
      expect(request.client).toMatchObject({ id: client.id, email: client.email });
      expect(request.message).toBe("Ready to start.");

      const other = await api.get("/v1/coach/coach-requests").set(auth(otherListedCoach));
      expect(other.body.requests.map((row: { id: string }) => row.id)).not.toContain(requestId);
    });

    it("won't let a different coach accept it", async () => {
      const res = await api.post(`/v1/coach/coach-requests/${requestId}/accept`).set(auth(otherListedCoach));
      expect(res.status).toBe(404);
    });

    it("blocks a coach who is not approved with 423", async () => {
      // A pending coach can't be requested, so plant a request directly.
      const planted = await prisma.coachRequest.create({ data: { clientId: otherClient.id, coachId: pendingListedCoach.id } });
      const res = await api.post(`/v1/coach/coach-requests/${planted.id}/accept`).set(auth(pendingListedCoach));
      expect(res.status).toBe(423);
    });

    it("accepting forms the same relationship an accepted invite does", async () => {
      // Before: the coach has no access to this client.
      const before = await api.get(`/v1/coach/clients/${client.id}/profile`).set(auth(listedCoach));
      expect(before.status).toBe(403);

      const res = await api.post(`/v1/coach/coach-requests/${requestId}/accept`).set(auth(listedCoach));
      expect(res.status).toBe(200);
      expect(res.body.request.status).toBe("ACCEPTED");

      const invite = await prisma.coachClientInvite.findFirst({
        where: { coachId: listedCoach.id, clientId: client.id, status: "ACCEPTED" },
      });
      expect(invite).not.toBeNull();

      // After: every existing coach-scoped check passes, with nothing request-specific.
      const after = await api.get(`/v1/coach/clients/${client.id}/profile`).set(auth(listedCoach));
      expect(after.status).toBe(200);

      // And the client sees the coach where invites have always surfaced.
      const accepted = await api.get("/v1/client/invites?status=ACCEPTED").set(auth(client));
      expect(accepted.body.invites.map((row: { coachId: string }) => row.coachId)).toContain(listedCoach.id);

      const detail = await api.get(`/v1/client/coaches/${listedCoach.id}`).set(auth(client));
      expect(detail.body.coach.relationship).toBe("COACHING");
    });

    it("can't be accepted twice", async () => {
      const res = await api.post(`/v1/coach/coach-requests/${requestId}/accept`).set(auth(listedCoach));
      expect(res.status).toBe(409);
    });

    it("rejects a new request once the client is already coached by that coach", async () => {
      const res = await api.post("/v1/client/coach-requests").set(auth(client)).send({ coachId: listedCoach.id });
      expect(res.status).toBe(409);
    });

    it("declining leaves no relationship", async () => {
      const sent = await api.post("/v1/client/coach-requests").set(auth(otherClient)).send({ coachId: otherListedCoach.id });
      const res = await api.post(`/v1/coach/coach-requests/${sent.body.request.id}/decline`).set(auth(otherListedCoach));
      expect(res.status).toBe(200);
      expect(res.body.request.status).toBe("DECLINED");

      const access = await api.get(`/v1/coach/clients/${otherClient.id}/profile`).set(auth(otherListedCoach));
      expect(access.status).toBe(403);
    });

    it("is coach-only", async () => {
      expect((await api.get("/v1/coach/coach-requests").set(auth(client))).status).toBe(403);
    });
  });

  describe("interplay with invites", () => {
    it("reports INVITED and refuses a request while the coach's own invite is pending", async () => {
      const invite = await api.post("/v1/coach/invites").set(auth(otherListedCoach)).send({ clientEmail: client.email });
      expect(invite.status).toBe(201);

      const detail = await api.get(`/v1/client/coaches/${otherListedCoach.id}`).set(auth(client));
      expect(detail.body.coach.relationship).toBe("INVITED");

      const res = await api.post("/v1/client/coach-requests").set(auth(client)).send({ coachId: otherListedCoach.id });
      expect(res.status).toBe(409);
    });

    it("accepting a request retires a pending invite from the same coach", async () => {
      // Plant the overlap directly: an invite out, and a request in, for one pair.
      const invite = await api.post("/v1/coach/invites").set(auth(listedCoach)).send({ clientEmail: otherClient.email });
      const request = await prisma.coachRequest.create({ data: { clientId: otherClient.id, coachId: listedCoach.id } });

      const res = await api.post(`/v1/coach/coach-requests/${request.id}/accept`).set(auth(listedCoach));
      expect(res.status).toBe(200);

      const stale = await prisma.coachClientInvite.findUnique({ where: { id: invite.body.invite.id } });
      expect(stale?.status).toBe("CANCELLED");
      const accepted = await prisma.coachClientInvite.count({
        where: { coachId: listedCoach.id, clientId: otherClient.id, status: "ACCEPTED" },
      });
      expect(accepted).toBe(1);
    });
  });
});
