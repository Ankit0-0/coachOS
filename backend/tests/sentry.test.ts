import * as Sentry from "@sentry/node";
import express, { type NextFunction, type Request, type Response } from "express";
import pino from "pino";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { loggerOptions } from "../src/config/logger.js";
import { REDACTED_KEYS, REDACTED_PATHS } from "../src/config/redaction.js";
import { initSentry, registerSentryErrorHandler, scrubEvent } from "../src/config/sentry.js";

/** Every event the SDK would have sent, straight from the transport. */
const sent: Sentry.ErrorEvent[] = [];

function inMemoryTransport(): ReturnType<NonNullable<Sentry.NodeOptions["transport"]>> {
  return {
    send: async (envelope) => {
      for (const [header, payload] of envelope[1]) {
        if ((header as { type?: string }).type === "event") sent.push(payload as Sentry.ErrorEvent);
      }
      return { statusCode: 200 };
    },
    flush: async () => true,
  };
}

async function flushed(): Promise<Sentry.ErrorEvent[]> {
  await Sentry.flush(2000);
  return sent;
}

describe("sentry", () => {
  describe("without a DSN", () => {
    it("never starts, so local development, CI and tests send nothing", () => {
      expect(initSentry({ dsn: "" })).toBe(false);
      expect(Sentry.isInitialized()).toBe(false);
    });
  });

  describe("scrubbing", () => {
    it("covers every field the logger redacts", () => {
      for (const path of REDACTED_PATHS) {
        expect(REDACTED_KEYS.has(path.split(".").pop()!.toLowerCase())).toBe(true);
      }
    });

    it("drops bodies and cookies and censors redacted fields wherever they sit", () => {
      const event = scrubEvent({
        request: {
          url: "https://api.example.com/v1/auth/reset-password?code=ABCD2345&page=2",
          query_string: "token=abc&page=2",
          data: { email: "sam@example.com", password: "hunter22" },
          cookies: { session: "abc" },
          headers: { Authorization: "Bearer secret-jwt", "content-type": "application/json" },
        },
        extra: { logMessage: "boom", context: { newPassword: "x", nested: { accessToken: "y" } } },
        breadcrumbs: [{ category: "http", data: { url: "/v1/x?idToken=zzz", apiKey: "k" } }],
      } as Sentry.Event);

      expect(event.request?.data).toBeUndefined();
      expect(event.request?.cookies).toBeUndefined();
      expect(event.request?.headers).toEqual({ Authorization: "[REDACTED]", "content-type": "application/json" });
      expect(event.request?.url).toBe("https://api.example.com/v1/auth/reset-password?code=%5BREDACTED%5D&page=2");
      expect(event.request?.query_string).toBe("token=%5BREDACTED%5D&page=2");
      expect(event.extra).toEqual({ logMessage: "boom", context: { newPassword: "[REDACTED]", nested: { accessToken: "[REDACTED]" } } });
      expect(event.breadcrumbs?.[0]?.data).toEqual({ url: "/v1/x?idToken=%5BREDACTED%5D", apiKey: "[REDACTED]" });
    });
  });

  describe("what gets reported", () => {
    const app = express();
    // The same hook the real logger runs, over a logger that writes nowhere.
    const log = pino({ ...loggerOptions, level: "debug" }, { write: () => undefined });

    beforeAll(() => {
      expect(initSentry({ dsn: "https://public@o0.ingest.sentry.io/0", transport: inMemoryTransport })).toBe(true);

      app.use(express.json());
      app.get("/boom", () => {
        throw new Error("route exploded");
      });
      app.get("/forbidden", (_request: Request, _response: Response, next: NextFunction) => {
        next(Object.assign(new Error("not yours"), { status: 403 }));
      });
      app.post("/json", (_request: Request, response: Response) => {
        response.sendStatus(200);
      });
      app.get("/caught", (_request: Request, response: Response) => {
        // What a route does with an unexpected failure: log it, answer 500.
        log.error({ err: new Error("database went away") }, "GET /caught: unexpected error");
        response.sendStatus(500);
      });
      registerSentryErrorHandler(app);
      // Like app.ts: the app's own handler logs the error it is passed on.
      app.use((error: Error & { status?: number }, _request: Request, response: Response, _next: NextFunction) => {
        const status = error.status ?? 500;
        if (status >= 500) log.error({ err: error }, "Unhandled error");
        else log.warn({ err: error, status }, "Request rejected");
        response.sendStatus(status);
      });
    });

    beforeEach(() => {
      sent.length = 0;
    });

    afterAll(async () => {
      await Sentry.close(2000);
    });

    it("reports an unhandled throw once, with its stack, even though it is also logged", async () => {
      expect((await request(app).get("/boom")).status).toBe(500);
      const events = await flushed();
      expect(events).toHaveLength(1);
      const exception = events[0]!.exception!.values![0]!;
      expect(exception.value).toBe("route exploded");
      expect(exception.stacktrace?.frames?.some((frame) => frame.filename?.includes("sentry.test.ts"))).toBe(true);
    });

    it("reports an unexpected error a route caught and logged", async () => {
      expect((await request(app).get("/caught")).status).toBe(500);
      const events = await flushed();
      expect(events).toHaveLength(1);
      expect(events[0]!.exception!.values![0]!.value).toBe("database went away");
      expect(events[0]!.extra?.logMessage).toBe("GET /caught: unexpected error");
    });

    it("does not report a 403 or a malformed body", async () => {
      expect((await request(app).get("/forbidden")).status).toBe(403);
      expect((await request(app).post("/json").set("Content-Type", "application/json").send("{bad")).status).toBe(400);
      expect(await flushed()).toHaveLength(0);
    });

    it("ignores warn lines, lines without an error, and pino-http's made-up completion error", async () => {
      log.warn({ err: new Error("expected") }, "a client mistake");
      log.error({ missing: ["S3_BUCKET"] }, "misconfigured, no error object");
      log.error({ res: { statusCode: 500 }, err: new Error("failed with status code 500") }, "HTTP request failed");
      expect(await flushed()).toHaveLength(0);
    });
  });
});
