import express from "express";
import pino from "pino";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";

import { app } from "../src/app.js";
import { env } from "../src/config/env.js";
import { attachRequestLogger, createHttpLogger } from "../src/config/http-logger.js";
import { getLogger, loggerOptions } from "../src/config/logger.js";

/** Collects the JSON lines a pino logger writes, so a test can read what really came out. */
function capture() {
  const lines: Record<string, unknown>[] = [];
  const stream = {
    write(chunk: string) {
      lines.push(JSON.parse(chunk));
    },
  };
  return { lines, logger: pino({ ...loggerOptions, level: "debug" }, stream) };
}

/** The real middleware, over a captured stream, in front of routes that mimic the app's. */
function appWithCapturedLogs() {
  const { lines, logger } = capture();
  const testApp = express();
  testApp.use(createHttpLogger(logger));
  testApp.use(attachRequestLogger);
  testApp.get("/heartbeat", (_request, response) => {
    response.status(200).json({ status: "beating" });
  });
  testApp.get("/deep", (_request, response) => {
    // A service logging through the request context, with no access to `request`.
    getLogger().info({ step: "one" }, "service line one");
    getLogger().debug({ step: "two" }, "service line two");
    response.status(200).json({ ok: true });
  });
  testApp.get("/boom", () => {
    throw new Error("something broke deep inside");
  });
  // The app's own handler: without one, Express answers 500 and the stack is never logged.
  testApp.use((error: unknown, request: express.Request, response: express.Response, _next: express.NextFunction) => {
    request.log.error({ err: error }, "Unhandled error");
    response.status(500).end();
  });
  testApp.get("/unwell", (_request, response) => {
    response.status(503).json({ message: "not ready" });
  });
  return { testApp, lines };
}

describe("logging", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("redaction", () => {
    it("censors credentials wherever they appear in a logged object", () => {
      const { lines, logger } = capture();
      logger.info(
        {
          password: "hunter2",
          newPassword: "hunter3",
          token: "jwt-value",
          accessToken: "access-value",
          code: "ABCD1234",
          authorization: "Bearer jwt-value",
          DATABASE_URL: "postgres://user:pw@host/db",
          awsSecretAccessKey: "aws-secret",
          // An address is personal data, so it is redacted like a credential.
          email: "someone@example.com",
          user: { password: "nested-secret", token: "nested-token", email: "nested@example.com" },
          userId: "user-123",
          req: { headers: { authorization: "Bearer jwt-value", cookie: "session=abc" } },
        },
        "everything sensitive",
      );

      const line = JSON.stringify(lines[0]);
      for (const secret of [
        "hunter2",
        "hunter3",
        "jwt-value",
        "access-value",
        "ABCD1234",
        "postgres://user:pw@host/db",
        "aws-secret",
        "nested-secret",
        "nested-token",
        "session=abc",
        "someone@example.com",
        "nested@example.com",
      ]) {
        expect(line).not.toContain(secret);
      }
      expect(line).toContain("[REDACTED]");
      // Redaction is targeted: ordinary fields still come through.
      expect(line).toContain("user-123");
    });
  });

  describe("base fields and error serialization", () => {
    it("stamps every line with the service, version and environment", () => {
      const { lines, logger } = capture();
      logger.info("hello");
      expect(lines[0]).toMatchObject({ service: "coachos-api", version: env.appVersion, env: env.nodeEnv });
    });

    it("logs a thrown error with its message and stack, not an empty object", () => {
      const { lines, logger } = capture();
      logger.error({ err: new Error("kaboom") }, "it failed");
      const err = lines[0]?.err as { message?: string; stack?: string; type?: string };
      expect(err.message).toBe("kaboom");
      expect(err.type).toBe("Error");
      expect(err.stack).toContain("logging.test.ts");
    });
  });

  describe("request correlation", () => {
    it("gives every line from one request the same id, and echoes it to the client", async () => {
      const { testApp, lines } = appWithCapturedLogs();
      const response = await request(testApp).get("/deep");

      expect(response.status).toBe(200);
      const header = response.headers["x-request-id"];
      expect(header).toMatch(/^[0-9a-f-]{36}$/);

      const ids = lines.map((line) => line.requestId);
      expect(lines).toHaveLength(3);
      expect(new Set(ids)).toEqual(new Set([header]));
      // The service lines carry the request's method and path without being handed them.
      expect(lines[0]).toMatchObject({ message: "service line one", method: "GET", path: "/deep" });
      expect(lines[2]).toMatchObject({ message: "HTTP request completed", level: 30 });
      expect(typeof lines[2]?.durationMs).toBe("number");
    });

    it("keeps an X-Request-Id the caller supplied", async () => {
      const { testApp, lines } = appWithCapturedLogs();
      const response = await request(testApp).get("/deep").set("X-Request-Id", "caller-supplied-id");

      expect(response.headers["x-request-id"]).toBe("caller-supplied-id");
      expect(lines.every((line) => line.requestId === "caller-supplied-id")).toBe(true);
    });

    it("logs one completion line per request, not one on the way in as well", async () => {
      const { testApp, lines } = appWithCapturedLogs();
      await request(testApp).get("/heartbeat");
      expect(lines.filter((line) => line.message === "HTTP request completed")).toHaveLength(1);
    });

    it("puts the id on the real app's responses too", async () => {
      const response = await request(app).get("/heartbeat");
      expect(response.headers["x-request-id"]).toMatch(/^[0-9a-f-]{36}$/);
    });

    it("answers malformed JSON with the parser's 400, not a 500", async () => {
      const response = await request(app)
        .post("/v1/auth/login")
        .set("Content-Type", "application/json")
        .send("{not json");
      expect(response.status).toBe(400);
    });
  });

  describe("levels", () => {
    it("logs a successful health check at info while LOG_HEALTH_CHECKS is on", async () => {
      const { testApp, lines } = appWithCapturedLogs();
      await request(testApp).get("/heartbeat");
      expect(lines[0]).toMatchObject({ level: 30, message: "HTTP request completed" });
    });

    it("drops successful health checks when the switch is off, but never a failing one", async () => {
      const original = env.logHealthChecks;
      Object.assign(env, { logHealthChecks: false });
      try {
        const { testApp, lines } = appWithCapturedLogs();
        await request(testApp).get("/heartbeat");
        expect(lines).toHaveLength(0);

        await request(testApp).get("/unwell");
        expect(lines).toHaveLength(1);
        expect(lines[0]).toMatchObject({ level: 50 });
      } finally {
        Object.assign(env, { logHealthChecks: original });
      }
    });

    it("logs a 5xx at error with the stack, and a 4xx at warn", async () => {
      const { testApp, lines } = appWithCapturedLogs();
      await request(testApp).get("/boom");
      const failure = lines.find((line) => line.level === 50);
      expect((failure?.err as { stack?: string })?.stack).toContain("something broke deep inside");

      await request(testApp).get("/nowhere");
      expect(lines.some((line) => line.level === 40)).toBe(true);
    });
  });

  describe("configuration", () => {
    it("resolves to info in production when LOG_LEVEL is unset", async () => {
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("LOG_LEVEL", undefined);
      vi.resetModules();
      const fresh = await import("../src/config/env.js");
      expect(fresh.env.logLevel).toBe("info");
      expect(fresh.env.logHealthChecks).toBe(true);
    });
  });
});
