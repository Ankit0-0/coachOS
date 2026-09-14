import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

import { env } from "./env.js";

export class PrismaService {
  private static instance: PrismaService | undefined;
  public readonly client: PrismaClient;

  private constructor() {
    const adapter = new PrismaPg({ connectionString: env.databaseUrl, max: env.dbPoolMax });
    this.client = new PrismaClient({ adapter });
  }

  public static getInstance(): PrismaService {
    PrismaService.instance ??= new PrismaService();
    return PrismaService.instance;
  }

  /**
   * Runs a real query rather than trusting `$connect()`: with the pg driver
   * adapter, `$connect()` opens no connection, so a wrong DATABASE_URL or a
   * rejected TLS certificate would otherwise boot "successfully", pass the
   * health check, and fail every request. Failing here fails the deploy instead.
   */
  public async connect(): Promise<void> {
    await this.client.$connect();
    await this.client.$queryRaw`SELECT 1`;
  }

  public async disconnect(): Promise<void> {
    await this.client.$disconnect();
  }
}

export const prisma = PrismaService.getInstance().client;