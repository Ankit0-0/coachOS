import dotenv from "dotenv";

import { app } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { PrismaService } from "./config/prisma.config.js";

dotenv.config();

class Server {
  private readonly prisma: PrismaService;

  public constructor(private readonly port: number | string) {
    this.prisma = PrismaService.getInstance();
  }

  public async start(): Promise<void> {
    await this.prisma.connect();
    app.listen(this.port, () => {
      logger.info({ port: this.port }, "Server started");
    });
  }
}

const server = new Server(env.port);
server.start().catch((error: unknown) => {
  logger.fatal({ error }, "Unable to start server");
  process.exitCode = 1;
});
