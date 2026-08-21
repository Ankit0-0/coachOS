import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

import { env } from "./env.js";

export class PrismaService {
  private static instance: PrismaService | undefined;
  public readonly client: PrismaClient;

  private constructor() {
    const adapter = new PrismaPg({ connectionString: env.databaseUrl });
    this.client = new PrismaClient({ adapter });
  }

  public static getInstance(): PrismaService {
    PrismaService.instance ??= new PrismaService();
    return PrismaService.instance;
  }

  public async connect(): Promise<void> {
    await this.client.$connect();
  }

  public async disconnect(): Promise<void> {
    await this.client.$disconnect();
  }
}

export const prisma = PrismaService.getInstance().client;