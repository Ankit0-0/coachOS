import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The SDK's presigner is mocked for the whole file — no request in here reaches
 * S3. What matters is what the service *asks* it to sign, so the mock records
 * its arguments and hands back a fixed URL.
 */
const { getSignedUrlMock } = vi.hoisted(() => ({ getSignedUrlMock: vi.fn() }));

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: getSignedUrlMock,
}));

import { env } from "../src/config/env.js";
import { logger } from "../src/config/logger.js";
import { getSignedReadUrl, isOwnedKey } from "../src/features/upload/service.js";
import {
  api,
  cleanupUser,
  createAcceptedInvite,
  registerUser,
  VALID_DIET_CONTENT,
  type TestUser,
} from "./helpers.js";

const SIGNED_URL = "https://bucket.s3.test.invalid/signed-url";

/** Credentials are set here rather than read from .env so the tests are deterministic. */
const TEST_AWS = {
  awsRegion: "eu-test-1",
  awsAccessKeyId: "AKIATESTTESTTESTTEST",
  awsSecretAccessKey: "test-secret-not-a-real-key",
  s3Bucket: "coachos-test-bucket",
} as const;

const originalAws = {
  awsRegion: env.awsRegion,
  awsAccessKeyId: env.awsAccessKeyId,
  awsSecretAccessKey: env.awsSecretAccessKey,
  s3Bucket: env.s3Bucket,
};

function setAws(values: Partial<typeof originalAws>) {
  Object.assign(env, values);
}

/** The `{ Bucket, Key, ContentType }` the service put into the signed command. */
function signedCommandInput(callIndex = 0) {
  const call = getSignedUrlMock.mock.calls[callIndex];
  if (!call) throw new Error("getSignedUrl was not called");
  return (call[1] as { input: Record<string, unknown> }).input;
}

function signedOptions(callIndex = 0) {
  const call = getSignedUrlMock.mock.calls[callIndex];
  if (!call) throw new Error("getSignedUrl was not called");
  return call[2] as { expiresIn?: number };
}

describe("uploads", () => {
  let client: TestUser;
  let coach: TestUser;

  beforeAll(async () => {
    client = await registerUser("CLIENT", "uploadclient");
    coach = await registerUser("COACH", "uploadcoach");
  });

  afterAll(async () => {
    Object.assign(env, originalAws);
    await cleanupUser(client.id);
    await cleanupUser(coach.id);
  });

  beforeEach(() => {
    setAws(TEST_AWS);
    getSignedUrlMock.mockReset();
    getSignedUrlMock.mockResolvedValue(SIGNED_URL);
  });

  function presign(user: TestUser | null, body: Record<string, unknown>) {
    const req = api.post("/v1/uploads/presign");
    if (user) req.set("Authorization", `Bearer ${user.token}`);
    return req.send(body);
  }

  describe("POST /v1/uploads/presign", () => {
    it("returns an upload URL and a key namespaced under the calling user's id", async () => {
      const res = await presign(client, { contentType: "image/jpeg", purpose: "weight" });

      expect(res.status).toBe(201);
      expect(res.body.uploadUrl).toBe(SIGNED_URL);
      expect(res.body.key).toMatch(new RegExp(`^users/${client.id}/weight/[a-z0-9]+\\.jpg$`));
    });

    it("namespaces each user under their own prefix, never a shared one", async () => {
      const mine = await presign(client, { contentType: "image/png", purpose: "avatar" });
      const theirs = await presign(coach, { contentType: "image/png", purpose: "avatar" });

      expect(mine.body.key.startsWith(`users/${client.id}/`)).toBe(true);
      expect(theirs.body.key.startsWith(`users/${coach.id}/`)).toBe(true);
      expect(mine.body.key).not.toBe(theirs.body.key);
    });

    it("ignores a client-supplied key or path entirely", async () => {
      const res = await presign(client, {
        contentType: "image/jpeg",
        purpose: "weight",
        // A caller trying to aim the upload at someone else's prefix.
        key: `users/${coach.id}/avatar/overwrite.jpg`,
        path: "../../../etc/passwd",
        Key: `users/${coach.id}/avatar/overwrite.jpg`,
      });

      expect(res.status).toBe(201);
      // Not just "different" — the returned key is built from the token's user
      // id and the supplied strings appear nowhere in it or in what was signed.
      expect(res.body.key).toMatch(new RegExp(`^users/${client.id}/weight/[a-z0-9]+\\.jpg$`));
      expect(res.body.key).not.toContain(coach.id);
      expect(res.body.key).not.toContain("..");
      expect(signedCommandInput().Key).toBe(res.body.key);
    });

    it("pins the requested content type into the signed command", async () => {
      await presign(client, { contentType: "image/webp", purpose: "diet" });

      const input = signedCommandInput();
      expect(input.ContentType).toBe("image/webp");
      expect(input.Bucket).toBe(TEST_AWS.s3Bucket);
      expect(String(input.Key).endsWith(".webp")).toBe(true);
    });

    it("asks the presigner to sign the content-type header, not just set it", async () => {
      await presign(client, { contentType: "image/png", purpose: "avatar" });

      // Setting ContentType on the command is not enough: by default only `host`
      // is signed, and S3 then accepts a PUT with any Content-Type. Found by
      // PUTting text/html against a real presigned URL and getting a 200.
      const options = signedOptions() as { signableHeaders?: Set<string> };
      expect(options.signableHeaders?.has("content-type")).toBe(true);
    });

    it("gives the upload URL a short expiry", async () => {
      await presign(client, { contentType: "image/jpeg", purpose: "weight" });
      expect(signedOptions().expiresIn).toBe(5 * 60);
    });

    it("puts each purpose in its own folder", async () => {
      for (const purpose of ["weight", "diet", "avatar"] as const) {
        const res = await presign(client, { contentType: "image/jpeg", purpose });
        expect(res.body.key).toContain(`/${purpose}/`);
      }
    });

    it("lets a coach presign too — uploads are not client-only", async () => {
      const res = await presign(coach, { contentType: "image/png", purpose: "avatar" });
      expect(res.status).toBe(201);
    });

    it.each(["application/pdf", "text/html", "image/svg+xml", "image/gif", "application/octet-stream"])(
      "rejects contentType %s",
      async (contentType) => {
        const res = await presign(client, { contentType, purpose: "avatar" });

        expect(res.status).toBe(400);
        expect(getSignedUrlMock).not.toHaveBeenCalled();
      },
    );

    it("rejects an unknown purpose", async () => {
      const res = await presign(client, { contentType: "image/jpeg", purpose: "plan-attachment" });
      expect(res.status).toBe(400);
    });

    it("rejects a missing body", async () => {
      const res = await presign(client, {});
      expect(res.status).toBe(400);
    });

    it("returns 401 without a token", async () => {
      const res = await presign(null, { contentType: "image/jpeg", purpose: "weight" });

      expect(res.status).toBe(401);
      expect(getSignedUrlMock).not.toHaveBeenCalled();
    });

    it("returns 401 for a malformed token", async () => {
      const res = await api
        .post("/v1/uploads/presign")
        .set("Authorization", "Bearer not-a-real-token")
        .send({ contentType: "image/jpeg", purpose: "weight" });

      expect(res.status).toBe(401);
    });
  });

  describe("getSignedReadUrl", () => {
    it("returns null for a null key rather than throwing", async () => {
      await expect(getSignedReadUrl(null)).resolves.toBeNull();
      expect(getSignedUrlMock).not.toHaveBeenCalled();
    });

    it("returns null for an empty key", async () => {
      await expect(getSignedReadUrl("")).resolves.toBeNull();
      expect(getSignedUrlMock).not.toHaveBeenCalled();
    });

    it("signs a GET for a real key, with an hour's expiry", async () => {
      const url = await getSignedReadUrl("users/abc/weight/xyz.jpg");

      expect(url).toBe(SIGNED_URL);
      expect(signedCommandInput().Key).toBe("users/abc/weight/xyz.jpg");
      expect(signedOptions().expiresIn).toBe(60 * 60);
    });

    it("returns null instead of throwing when signing fails", async () => {
      getSignedUrlMock.mockRejectedValueOnce(new Error("clock skew"));

      // A broken thumbnail is acceptable; a failed weight-history request is not.
      await expect(getSignedReadUrl("users/abc/weight/xyz.jpg")).resolves.toBeNull();
    });
  });

  describe("isOwnedKey", () => {
    it("accepts a key under the user's own prefix and rejects anything else", () => {
      expect(isOwnedKey("users/user-1/weight/a.jpg", "user-1")).toBe(true);
      expect(isOwnedKey("users/user-2/weight/a.jpg", "user-1")).toBe(false);
      // A prefix that merely starts with the id must not pass.
      expect(isOwnedKey("users/user-10/weight/a.jpg", "user-1")).toBe(false);
      expect(isOwnedKey("weight/a.jpg", "user-1")).toBe(false);
    });
  });

  describe("with AWS environment variables unset", () => {
    let errorSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      setAws({ awsRegion: undefined, awsAccessKeyId: undefined, awsSecretAccessKey: undefined, s3Bucket: undefined });
      errorSpy = vi.spyOn(logger, "error").mockImplementation(() => {});
    });

    afterEach(() => {
      errorSpy.mockRestore();
      setAws(TEST_AWS);
    });

    it("fails the presign request with 503 and never calls the signer", async () => {
      const res = await presign(client, { contentType: "image/jpeg", purpose: "weight" });

      expect(res.status).toBe(503);
      expect(getSignedUrlMock).not.toHaveBeenCalled();
    });

    it("logs which variables are missing, by name", async () => {
      await presign(client, { contentType: "image/jpeg", purpose: "weight" });

      const messages = errorSpy.mock.calls.map((call: unknown[]) => String(call[1] ?? ""));
      expect(messages.some((message: string) => message.includes("AWS_REGION"))).toBe(true);
      expect(messages.some((message: string) => message.includes("S3_BUCKET"))).toBe(true);
    });

    it("fails the same way when only one variable is missing", async () => {
      setAws({ ...TEST_AWS, s3Bucket: undefined });

      const res = await presign(client, { contentType: "image/jpeg", purpose: "weight" });
      expect(res.status).toBe(503);
    });

    it("still returns null from getSignedReadUrl rather than erroring", async () => {
      // This is the CI case: reads have to keep working with no credentials at
      // all, just without thumbnails.
      await expect(getSignedReadUrl("users/abc/weight/xyz.jpg")).resolves.toBeNull();
    });

    it("leaves the rest of the API working — nothing has crashed", async () => {
      const health = await api.get("/v1/health");
      expect(health.status).toBe(200);

      const me = await api.get("/v1/me").set("Authorization", `Bearer ${client.token}`);
      expect(me.status).toBe(200);

      // And a weight read, which serializes a photo key, still succeeds.
      const weights = await api
        .get("/v1/tracking/weight")
        .query({ from: "2026-01-01", to: "2026-12-31" })
        .set("Authorization", `Bearer ${client.token}`);
      expect(weights.status).toBe(200);
    });

    it("recovers as soon as the variables are set again", async () => {
      setAws(TEST_AWS);

      const res = await presign(client, { contentType: "image/jpeg", purpose: "weight" });
      expect(res.status).toBe(201);
    });
  });

  describe("keys are re-checked when they come back in on a write", () => {
    it("rejects a weight entry carrying another user's photo key", async () => {
      const res = await api
        .post("/v1/tracking/weight")
        .set("Authorization", `Bearer ${client.token}`)
        .send({ date: "2026-09-10", weightKg: 70, photoKey: `users/${coach.id}/weight/stolen.jpg` });

      // Without this check, the server would sign a read URL for someone
      // else's object on the attacker's own record.
      expect(res.status).toBe(403);
    });

    it("accepts a weight entry carrying the caller's own key and returns a signed URL", async () => {
      const presigned = await presign(client, { contentType: "image/jpeg", purpose: "weight" });

      const res = await api
        .post("/v1/tracking/weight")
        .set("Authorization", `Bearer ${client.token}`)
        .send({ date: "2026-09-11", weightKg: 70.5, photoKey: presigned.body.key });

      expect(res.status).toBe(200);
      expect(res.body.weightEntry.photoUrl).toBe(SIGNED_URL);
      // The response carries a URL, never the raw key.
      expect(res.body.weightEntry).not.toHaveProperty("photoKey");
    });

    it("rejects an avatar key belonging to another user", async () => {
      const res = await api
        .patch("/v1/client/profile")
        .set("Authorization", `Bearer ${client.token}`)
        .send({ avatarKey: `users/${coach.id}/avatar/stolen.jpg` });

      expect(res.status).toBe(403);
    });

    it("stores the caller's own avatar key and returns it as a signed avatarUrl", async () => {
      const presigned = await presign(client, { contentType: "image/png", purpose: "avatar" });

      const res = await api
        .patch("/v1/client/profile")
        .set("Authorization", `Bearer ${client.token}`)
        .send({ avatarKey: presigned.body.key });

      expect(res.status).toBe(200);
      expect(res.body.profile.avatarUrl).toBe(SIGNED_URL);
      expect(res.body.profile).not.toHaveProperty("avatarKey");
    });

    it("clears the avatar when sent an explicit null", async () => {
      const res = await api
        .patch("/v1/client/profile")
        .set("Authorization", `Bearer ${client.token}`)
        .send({ avatarKey: null });

      expect(res.status).toBe(200);
      expect(res.body.profile.avatarUrl).toBeNull();
    });
  });
  describe("check-in photo keys", () => {
    let photoCoach: TestUser;
    let photoClient: TestUser;
    let assignmentId: string;
    const today = new Date().toISOString().slice(0, 10);

    beforeAll(async () => {
      photoCoach = await registerUser("COACH", "photocoach");
      photoClient = await registerUser("CLIENT", "photoclient");
      await createAcceptedInvite(photoCoach, photoClient);

      const plan = await api
        .post("/v1/coach/plans")
        .set("Authorization", `Bearer ${photoCoach.token}`)
        .send({ type: "DIET", title: "Photo plan", content: VALID_DIET_CONTENT });

      const assignment = await api
        .post("/v1/coach/assignments")
        .set("Authorization", `Bearer ${photoCoach.token}`)
        .send({ clientId: photoClient.id, planId: plan.body.plan.id });
      assignmentId = assignment.body.assignment.id as string;
    });

    afterAll(async () => {
      await cleanupUser(photoCoach.id);
      await cleanupUser(photoClient.id);
    });

    function saveCheckIn(body: Record<string, unknown>) {
      return api
        .post("/v1/tracking/checkin")
        .set("Authorization", `Bearer ${photoClient.token}`)
        .send({ assignmentId, date: today, completedItemIds: [], ...body });
    }

    it("stores a per-item map and returns it as signed photoUrls", async () => {
      const res = await saveCheckIn({
        photoKeys: {
          breakfast: `users/${photoClient.id}/diet/one.jpg`,
          lunch: `users/${photoClient.id}/diet/two.jpg`,
        },
      });

      expect(res.status).toBe(200);
      expect(res.body.checkIn.photoUrls).toEqual({ breakfast: SIGNED_URL, lunch: SIGNED_URL });
      // The keys themselves never leave the server.
      expect(res.body.checkIn).not.toHaveProperty("photoKeys");
    });

    it("returns the signed map on a later read too", async () => {
      const res = await api
        .get("/v1/tracking/checkin")
        .query({ assignmentId, from: today, to: today })
        .set("Authorization", `Bearer ${photoClient.token}`);

      expect(res.status).toBe(200);
      expect(res.body.checkIns[0].photoUrls).toEqual({ breakfast: SIGNED_URL, lunch: SIGNED_URL });
    });

    it("shows the same signed map to the client's coach, read-only", async () => {
      const res = await api
        .get(`/v1/coach/clients/${photoClient.id}/checkins`)
        .query({ from: today, to: today })
        .set("Authorization", `Bearer ${photoCoach.token}`);

      expect(res.status).toBe(200);
      expect(res.body.checkIns[0].photoUrls).toEqual({ breakfast: SIGNED_URL, lunch: SIGNED_URL });
    });

    it("rejects the whole map if any key belongs to another user", async () => {
      const res = await saveCheckIn({
        photoKeys: {
          breakfast: `users/${photoClient.id}/diet/mine.jpg`,
          lunch: `users/${photoCoach.id}/diet/theirs.jpg`,
        },
      });

      expect(res.status).toBe(403);
    });

    it("leaves the stored map untouched after a rejected write", async () => {
      const res = await api
        .get("/v1/tracking/checkin")
        .query({ assignmentId, from: today, to: today })
        .set("Authorization", `Bearer ${photoClient.token}`);

      expect(res.body.checkIns[0].photoUrls).toEqual({ breakfast: SIGNED_URL, lunch: SIGNED_URL });
    });

    it("clears every photo when sent an explicit null", async () => {
      const res = await saveCheckIn({ photoKeys: null });

      expect(res.status).toBe(200);
      expect(res.body.checkIn.photoUrls).toBeNull();
    });

    it("leaves photos alone when photoKeys is omitted", async () => {
      await saveCheckIn({ photoKeys: { breakfast: `users/${photoClient.id}/diet/again.jpg` } });

      // A plain tick-a-meal save sends no photoKeys and must not wipe them.
      const res = await saveCheckIn({ completedItemIds: ["breakfast"] });

      expect(res.status).toBe(200);
      expect(res.body.checkIn.photoUrls).toEqual({ breakfast: SIGNED_URL });
    });

    it("adds one item's photo without wiping the others", async () => {
      await saveCheckIn({ photoKeys: { dinner: `users/${photoClient.id}/diet/dinner.jpg` } });

      // The app only knows the key it just uploaded — it never sees stored keys —
      // so a single-item patch must merge. Found in the real diet screen, where
      // adding Lunch's photo erased Breakfast's.
      const res = await saveCheckIn({ photoKeys: { lunch: `users/${photoClient.id}/diet/lunch.jpg` } });

      expect(res.status).toBe(200);
      expect(Object.keys(res.body.checkIn.photoUrls).sort()).toEqual(["breakfast", "dinner", "lunch"]);
    });

    it("removes just one item's photo when its value is null", async () => {
      const res = await saveCheckIn({ photoKeys: { dinner: null } });

      expect(res.status).toBe(200);
      expect(Object.keys(res.body.checkIn.photoUrls).sort()).toEqual(["breakfast", "lunch"]);
    });

    it("returns null rather than an empty object when there are no photos", async () => {
      const fresh = await api
        .post("/v1/tracking/checkin")
        .set("Authorization", `Bearer ${photoClient.token}`)
        .send({ assignmentId, date: "2026-01-15", completedItemIds: [] });

      expect(fresh.body.checkIn.photoUrls).toBeNull();
    });
  });
});
