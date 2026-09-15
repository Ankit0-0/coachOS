import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

/**
 * The presigner is mocked so the signed URL names the key it was asked to sign:
 * no request reaches S3, and a test can tell whose photo came back.
 */
const { getSignedUrlMock } = vi.hoisted(() => ({ getSignedUrlMock: vi.fn() }));

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: getSignedUrlMock,
}));

import { env } from "../src/config/env.js";
import { api, cleanupUser, createAcceptedInvite, registerUser, type TestUser } from "./helpers.js";

const originalAws = {
  awsRegion: env.awsRegion,
  awsAccessKeyId: env.awsAccessKeyId,
  awsSecretAccessKey: env.awsSecretAccessKey,
  s3Bucket: env.s3Bucket,
};

function auth(user: TestUser) {
  return { Authorization: `Bearer ${user.token}` };
}

type RosterRow = { clientId: string | null; client?: { id: string; avatarUrl?: string | null } };
type ClientInviteRow = { coachId: string; coach: { id: string; avatarUrl?: string | null } };

/**
 * Photos, like phone numbers, belong to an established relationship: the coach
 * roster shows an accepted client's photo, the client's accepted invite shows
 * the coach's, and a pending invite shows neither.
 */
describe("avatars on invites", () => {
  let coach: TestUser;
  let client: TestUser;
  let invitedOnly: TestUser;
  let noPhotoClient: TestUser;
  const clientKey = () => `users/${client.id}/avatar/me.jpg`;
  const invitedKey = () => `users/${invitedOnly.id}/avatar/me.jpg`;
  const coachKey = () => `users/${coach.id}/avatar/me.jpg`;

  beforeAll(async () => {
    Object.assign(env, {
      awsRegion: "eu-test-1",
      awsAccessKeyId: "AKIATESTTESTTESTTEST",
      awsSecretAccessKey: "test-secret-not-a-real-key",
      s3Bucket: "coachos-test-bucket",
    });
    getSignedUrlMock.mockImplementation((_client: unknown, command: { input: { Key: string } }) =>
      Promise.resolve(`https://signed.test.invalid/${command.input.Key}`),
    );

    coach = await registerUser("COACH", "avcoach");
    client = await registerUser("CLIENT", "avclient");
    invitedOnly = await registerUser("CLIENT", "avinvited");
    noPhotoClient = await registerUser("CLIENT", "avnophoto");

    await api.patch("/v1/client/profile").set(auth(client)).send({ avatarKey: clientKey() });
    await api.patch("/v1/client/profile").set(auth(invitedOnly)).send({ avatarKey: invitedKey() });
    await api
      .patch("/v1/coach/profile")
      .set(auth(coach))
      .send({ avatarKey: coachKey(), bio: "Lifting for longevity.", specialties: ["Strength", "Mobility"], yearsExperience: 7 });

    await createAcceptedInvite(coach, client);
    await createAcceptedInvite(coach, noPhotoClient);
    const pending = await api.post("/v1/coach/invites").set(auth(coach)).send({ clientEmail: invitedOnly.email });
    if (pending.status !== 201) throw new Error(`Failed to create pending invite: ${pending.status}`);
  });

  afterAll(async () => {
    Object.assign(env, originalAws);
    for (const user of [coach, client, invitedOnly, noPhotoClient]) await cleanupUser(user.id);
  });

  it("gives the coach roster each accepted client's signed photo, and null without one", async () => {
    const res = await api.get("/v1/coach/invites").query({ status: "ACCEPTED" }).set(auth(coach));
    expect(res.status).toBe(200);
    const rows = res.body.invites as RosterRow[];

    const withPhoto = rows.find((row) => row.clientId === client.id);
    expect(withPhoto?.client?.avatarUrl).toBe(`https://signed.test.invalid/${clientKey()}`);

    const withoutPhoto = rows.find((row) => row.clientId === noPhotoClient.id);
    expect(withoutPhoto?.client).toHaveProperty("avatarUrl", null);
  });

  it("keeps an invited-but-not-accepted client's photo off the coach's pending list", async () => {
    const res = await api.get("/v1/coach/invites").query({ status: "PENDING" }).set(auth(coach));
    const row = (res.body.invites as RosterRow[]).find((invite) => invite.clientId === invitedOnly.id);
    expect(row?.client).toMatchObject({ id: invitedOnly.id });
    expect(row?.client).not.toHaveProperty("avatarUrl");
    expect(JSON.stringify(res.body)).not.toContain(invitedKey());
  });

  it("gives the client their accepted coach's signed photo", async () => {
    const res = await api.get("/v1/client/invites").query({ status: "ACCEPTED" }).set(auth(client));
    const row = (res.body.invites as ClientInviteRow[]).find((invite) => invite.coachId === coach.id);
    expect(row?.coach.avatarUrl).toBe(`https://signed.test.invalid/${coachKey()}`);
  });

  it("gives the client their accepted coach's profile for the Your Coach page", async () => {
    const res = await api.get("/v1/client/invites").query({ status: "ACCEPTED" }).set(auth(client));
    const row = (res.body.invites as ClientInviteRow[]).find((invite) => invite.coachId === coach.id);
    expect(row?.coach).toMatchObject({
      bio: "Lifting for longevity.",
      specialties: ["Strength", "Mobility"],
      yearsExperience: 7,
    });
  });

  it("keeps the coach's photo and profile off an invite the client hasn't accepted", async () => {
    const res = await api.get("/v1/client/invites").query({ status: "PENDING" }).set(auth(invitedOnly));
    const row = (res.body.invites as ClientInviteRow[]).find((invite) => invite.coachId === coach.id);
    expect(row?.coach).toMatchObject({ id: coach.id });
    for (const field of ["avatarUrl", "bio", "specialties", "yearsExperience"]) {
      expect(row?.coach).not.toHaveProperty(field);
    }
    expect(JSON.stringify(res.body)).not.toContain(coachKey());
    expect(JSON.stringify(res.body)).not.toContain("Lifting for longevity.");
  });
});
