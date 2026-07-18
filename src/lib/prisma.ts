import { PrismaTiDBCloud } from "@tidbcloud/prisma-adapter";
import { PrismaClient } from "@prisma/client";
import "dotenv/config";

// Mencegah pembuatan instance PrismaClient berulang kali selama hot-reloading di mode development
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Adapter khusus TiDB Cloud
const adapter = new PrismaTiDBCloud({
  url: process.env.DATABASE_URL, // pastikan sudah ada ?sslaccept=strict di URL
});

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
