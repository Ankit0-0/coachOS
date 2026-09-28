// First, before any other import: Sentry has to load ahead of what it instruments.
import "./instrument.js";

import dotenv from "dotenv";
import type { Server as HttpServer } from "node:http";

import { app } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { PrismaService } from "./config/prisma.config.js";
import { flushSentry } from "./config/sentry.js";
import { startReminderJobs } from "./jobs/subscription-reminders.js";

dotenv.config();

/**
 * How long in-flight requests get to finish before the process exits anyway.
 * Render allows 30 seconds after SIGTERM, so this stays well inside it.
 */
const SHUTDOWN_TIMEOUT_MS = 10_000;

class Server {
  private readonly prisma: PrismaService;
  private httpServer: HttpServer | undefined;
  private isShuttingDown = false;
  private stopJobs: (() => void) | undefined;

  public constructor(private readonly port: number | string) {
    this.prisma = PrismaService.getInstance();
  }

  public async start(): Promise<void> {
    await this.prisma.connect();
    this.httpServer = app.listen(this.port, () => {
      logger.info({ port: this.port }, "Server started");
    });
    if (env.remindersEnabled) this.stopJobs = startReminderJobs();
    warnAboutProductionConfig();
  }

  /**
   * Stops accepting requests, lets in-flight ones finish, then closes the pg
   * pool. Render sends SIGTERM on every deploy; exiting without releasing the
   * pool leaks connections, and on a plan capped at 20 that runs out quickly.
   */
  public async shutdown(signal: NodeJS.Signals): Promise<void> {
    if (this.isShuttingDown) return;
    this.isShuttingDown = true;
    logger.info({ signal }, "Shutting down");

    // If something hangs, exit anyway rather than being killed mid-cleanup.
    const forceExit = setTimeout(() => {
      logger.error({ timeoutMs: SHUTDOWN_TIMEOUT_MS }, "Shutdown timed out, exiting");
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);
    forceExit.unref();

    this.stopJobs?.();
    try {
      const httpServer = this.httpServer;
      if (httpServer) {
        const closed = new Promise<void>((resolve, reject) => {
          httpServer.close((error) => (error ? reject(error) : resolve()));
        });
        // close() waits for every open socket; idle keep-alive ones would
        // otherwise hold it open until the timeout.
        httpServer.closeIdleConnections();
        await closed;
      }
      await this.prisma.disconnect();
      logger.info("Shutdown complete");
      await flushSentry();
      process.exit(0);
    } catch (error) {
      logger.error({ err: error }, "Error during shutdown");
      await flushSentry();
      process.exit(1);
    }
  }
}

/**
 * Settings the server boots without but production can't really run without.
 * Logged at error on every start so they are hard to miss in Render's logs.
 */
function warnAboutProductionConfig(): void {
  if (env.nodeEnv !== "production") return;
  if (!env.resendApiKey) {
    logger.error("RESEND_API_KEY is not set: password reset emails cannot be sent");
  } else if (env.resendFromEmail.includes("@resend.dev")) {
    logger.error(
      "RESEND_FROM_EMAIL uses Resend's shared resend.dev sender, which only delivers to the Resend account owner: verify a domain and set RESEND_FROM_EMAIL to an address on it",
    );
  }
  if (env.googleClientAudiences.length === 0) logger.error("GOOGLE_CLIENT_ID is not set: Google sign-in answers 503");
  if (env.appleBundleIds.length === 0) logger.error("APPLE_BUNDLE_IDS is not set: Sign in with Apple answers 503");
  if (!env.sentryDsn) logger.warn("SENTRY_DSN is not set: server errors are not reported");
}

const server = new Server(env.port);

for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.on(signal, () => void server.shutdown(signal));
}

server.start().catch((error: unknown) => {
  logger.fatal({ err: error }, "Unable to start server");
  // Exit outright: a half-started process with an open pool would otherwise
  // linger, and the host needs a non-zero exit to mark the deploy as failed.
  // Flushed first, or the report of why it failed never leaves the process.
  void flushSentry().finally(() => process.exit(1));
});
