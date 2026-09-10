import { afterEach, describe, expect, it } from "vitest";

import { prisma } from "../src/config/prisma.config.js";
import { hashResetCode } from "../src/utils/reset-code.js";
import { api, cleanupUser, registerUser, type TestUser } from "./helpers.js";

const ORIGINAL_PASSWORD = "password123";
const NEW_PASSWORD = "brand-new-password";

/** Reads the code back out of the DB — the email side is a dev-mode log. */
async function outstandingToken(userId: string) {
  const token = await prisma.passwordResetToken.findFirst({
    where: { userId, usedAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (!token) throw new Error("expected an outstanding reset token");
  return token;
}

/**
 * The stored hash can't be reversed, so tests plant a known code instead:
 * this is exactly what the service will hash and compare against.
 */
async function plantCode(userId: string, code: string) {
  const token = await outstandingToken(userId);
  return prisma.passwordResetToken.update({
    where: { id: token.id },
    data: { codeHash: hashResetCode(code) },
  });
}

describe("password reset", () => {
  const createdUserIds: string[] = [];

  async function newUser(prefix: string): Promise<TestUser> {
    const user = await registerUser("CLIENT", prefix);
    createdUserIds.push(user.id);
    return user;
  }

  afterEach(async () => {
    while (createdUserIds.length > 0) {
      const id = createdUserIds.pop();
      if (id) await cleanupUser(id);
    }
  });

  it("answers identically for a known and an unknown email", async () => {
    const user = await newUser("resetknown");

    const known = await api.post("/v1/auth/forgot-password").send({ email: user.email });
    const unknown = await api
      .post("/v1/auth/forgot-password")
      .send({ email: `definitely-not-registered-${Date.now()}@vitest.local` });

    expect(known.status).toBe(unknown.status);
    expect(known.status).toBe(200);
    expect(known.body).toEqual(unknown.body);
  });

  it("changes the password so the old one stops working and the new one starts", async () => {
    const user = await newUser("resetworks");
    await api.post("/v1/auth/forgot-password").send({ email: user.email });
    const code = "ABCD2345";
    await plantCode(user.id, code);

    const reset = await api
      .post("/v1/auth/reset-password")
      .send({ email: user.email, code, newPassword: NEW_PASSWORD });
    expect(reset.status).toBe(200);

    const oldLogin = await api
      .post("/v1/auth/login")
      .send({ email: user.email, password: ORIGINAL_PASSWORD });
    expect(oldLogin.status).toBe(401);

    const newLogin = await api
      .post("/v1/auth/login")
      .send({ email: user.email, password: NEW_PASSWORD });
    expect(newLogin.status).toBe(200);
    expect(newLogin.body.accessToken).toBeTruthy();
  });

  it("rejects an expired code", async () => {
    const user = await newUser("resetexpired");
    await api.post("/v1/auth/forgot-password").send({ email: user.email });
    const code = "EXPIRED2";
    const token = await plantCode(user.id, code);

    await prisma.passwordResetToken.update({
      where: { id: token.id },
      data: { expiresAt: new Date(Date.now() - 60 * 1000) },
    });

    const reset = await api
      .post("/v1/auth/reset-password")
      .send({ email: user.email, code, newPassword: NEW_PASSWORD });
    expect(reset.status).toBe(400);

    // The original password must still be the valid one.
    const login = await api
      .post("/v1/auth/login")
      .send({ email: user.email, password: ORIGINAL_PASSWORD });
    expect(login.status).toBe(200);
  });

  it("stops accepting the right code after 5 failed attempts, inside the expiry window", async () => {
    const user = await newUser("resetattempts");
    await api.post("/v1/auth/forgot-password").send({ email: user.email });
    const code = "GOODCODE";
    await plantCode(user.id, code);

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const wrong = await api
        .post("/v1/auth/reset-password")
        .send({ email: user.email, code: "WRONGCOD", newPassword: NEW_PASSWORD });
      expect(wrong.status).toBe(400);
    }

    const token = await outstandingToken(user.id);
    expect(token.attempts).toBe(5);
    expect(token.expiresAt.getTime()).toBeGreaterThan(Date.now());

    // Correct code, still unexpired — but the token is burned.
    const reset = await api
      .post("/v1/auth/reset-password")
      .send({ email: user.email, code, newPassword: NEW_PASSWORD });
    expect(reset.status).toBe(400);

    const login = await api
      .post("/v1/auth/login")
      .send({ email: user.email, password: ORIGINAL_PASSWORD });
    expect(login.status).toBe(200);
  });

  it("refuses to reuse a code that already changed a password", async () => {
    const user = await newUser("resetreuse");
    await api.post("/v1/auth/forgot-password").send({ email: user.email });
    const code = "ONCEONLY";
    await plantCode(user.id, code);

    const first = await api
      .post("/v1/auth/reset-password")
      .send({ email: user.email, code, newPassword: NEW_PASSWORD });
    expect(first.status).toBe(200);

    const second = await api
      .post("/v1/auth/reset-password")
      .send({ email: user.email, code, newPassword: "another-password-entirely" });
    expect(second.status).toBe(400);

    // The second attempt must not have taken effect.
    const login = await api
      .post("/v1/auth/login")
      .send({ email: user.email, password: NEW_PASSWORD });
    expect(login.status).toBe(200);
  });

  it("invalidates older outstanding codes once one of them is used", async () => {
    const user = await newUser("resetreplay");

    await api.post("/v1/auth/forgot-password").send({ email: user.email });
    const firstCode = "FIRSTCOD";
    await plantCode(user.id, firstCode);

    // A second request supersedes the first, but the first row is still unused.
    await api.post("/v1/auth/forgot-password").send({ email: user.email });
    const secondCode = "SECONDCD";
    await plantCode(user.id, secondCode);

    const reset = await api
      .post("/v1/auth/reset-password")
      .send({ email: user.email, code: secondCode, newPassword: NEW_PASSWORD });
    expect(reset.status).toBe(200);

    const replay = await api
      .post("/v1/auth/reset-password")
      .send({ email: user.email, code: firstCode, newPassword: "yet-another-password" });
    expect(replay.status).toBe(400);
  });
});
