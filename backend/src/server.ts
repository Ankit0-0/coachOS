import dotenv from "dotenv";
import type { Server as HttpServer } from "node:http";

import { app } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { PrismaService } from "./config/prisma.config.js";

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

  public constructor(private readonly port: number | string) {
    this.prisma = PrismaService.getInstance();
  }

  public async start(): Promise<void> {
    await this.prisma.connect();
    this.httpServer = app.listen(this.port, () => {
      logger.info({ port: this.port }, "Server started");
    });
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
      process.exit(0);
    } catch (error) {
      logger.error({ err: error }, "Error during shutdown");
      process.exit(1);
    }
  }
}

const server = new Server(env.port);

for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.on(signal, () => void server.shutdown(signal));
}

server.start().catch((error: unknown) => {
  logger.fatal({ err: error }, "Unable to start server");
  // Exit outright: a half-started process with an open pool would otherwise
  // linger, and the host needs a non-zero exit to mark the deploy as failed.
  process.exit(1);
});
