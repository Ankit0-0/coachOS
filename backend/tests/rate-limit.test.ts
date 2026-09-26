import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApiRateLimit, createAuthRateLimit, createPasswordResetRateLimit } from "../src/middleware/rate-limit.js";

/** A throwaway app with one limited route, so the suite's raised limits don't apply. */
function appWith(limiter: express.RequestHandler) {
  const app = express();
  app.set("trust proxy", 1);
  app.post("/", limiter, (_request, response) => {
    response.json({ ok: true });
  });
  return app;
}

describe("rate limits", () => {
  for (const [name, create] of [
    ["auth", createAuthRateLimit],
    ["password reset", createPasswordResetRateLimit],
    ["api", createApiRateLimit],
  ] as const) {
    it(`${name}: answers 429 with no body once an address uses up its budget`, async () => {
      const app = appWith(create(2));
      expect((await request(app).post("/")).status).toBe(200);
      expect((await request(app).post("/")).status).toBe(200);

      const limited = await request(app).post("/");
      expect(limited.status).toBe(429);
      expect(limited.text).toBe("");
    });
  }

  it("counts each forwarded address separately, so one visitor cannot lock out everyone behind the proxy", async () => {
    const app = appWith(createAuthRateLimit(1));
    expect((await request(app).post("/").set("X-Forwarded-For", "203.0.113.1")).status).toBe(200);
    expect((await request(app).post("/").set("X-Forwarded-For", "203.0.113.1")).status).toBe(429);
    expect((await request(app).post("/").set("X-Forwarded-For", "203.0.113.2")).status).toBe(200);
  });
});
