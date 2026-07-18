import { PrismaTiDBCloud } from "@tidbcloud/prisma-adapter";
import { PrismaClient } from "@prisma/client";
import "dotenv/config";

// Mencegah pembuatan instance PrismaClient berulang kali selama hot-reloading di mode development
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Buat deteksi fallback otomatis untuk menoleransi development lokal secara offline
const isLocalDB =
  process.env.DATABASE_URL &&
  (process.env.DATABASE_URL.includes("localhost") ||
    process.env.DATABASE_URL.includes("127.0.0.1") ||
    process.env.DATABASE_URL.startsWith("mysql://root"));

let prismaInstance: PrismaClient;

if (isLocalDB) {
  // FALLBACK LOKAL: Gunakan driver TCP standard biasa agar bisa dijalankan luring di komputer developer
  console.log("🔌 Menggunakan Koneksi Database Lokal (TCP Driver fallback)");
  const adapter = new PrismaTiDBCloud({
    url: process.env.DATABASE_URL,
  });
  prismaInstance = new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
} else {
  // PRODUKSI / STAGING CLOUD: Gunakan TiDB Cloud HTTP Serverless Driver yang sangat tangguh untuk ratusan user
  console.log(
    "⚡ Menggunakan Koneksi TiDB Cloud HTTP Serverless Driver (Stateless Pooler)",
  );

  // Ubah skema mysql:// menjadi https:// di URL untuk keperluan request REST driver serverless
  let httpUrl = process.env.DATABASE_URL || "";
  if (httpUrl.startsWith("mysql://")) {
    httpUrl = httpUrl.replace("mysql://", "https://");
  }

  const adapter = new PrismaTiDBCloud({
    url: httpUrl,
  });

  prismaInstance = new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? prismaInstance;

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
