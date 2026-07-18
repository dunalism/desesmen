# Rencana Migrasi ke TiDB Cloud HTTP Serverless Driver untuk Next.js & Prisma

## 1. Objective (Tujuan)

Merancang rencana migrasi (_migration planning_) arsitektur database aplikasi kita dari koneksi TCP standard (`mysql://...`) ke **TiDB Cloud Serverless HTTP Driver** (`@tidbcloud/serverless`). Langkah ini bertujuan untuk memecahkan masalah kemacetan koneksi (_connection starvation_) secara permanen pada saat ratusan siswa secara bersamaan mengirim lembar jawaban ujian CBT, sehingga aplikasi dapat melayani pengujian beban berskala besar (300+ VU) secara stabil tanpa terkendala batas timeout Vercel.

---

## 2. Affected Files (Berkas yang Terpengaruh)

Proses migrasi ini akan memodifikasi beberapa berkas konfigurasi database utama:

- `package.json` (Untuk menginstal dependensi driver HTTP baru)
- `src/lib/prisma.ts` (Untuk memperbarui instansiasi `PrismaClient` menggunakan adapter HTTP Driver)
- `.env` (Untuk memperbarui format koneksi database menggunakan protokol HTTPS)
- `planning/tidb-http-driver-migration.md` (Berkas perencanaan ini)

---

## 3. Implementation Steps (Langkah-Langkah Implementasi)

### Tahap 1: Instalasi Paket Baru

Kita perlu memasang adapter resmi dari TiDB Cloud dan Prisma untuk mendukung protokol HTTP Serverless:

```bash
pnpm add @tidbcloud/serverless
pnpm add -D @prisma/adapter-pg @tidbcloud/prisma-adapter
```

### Tahap 2: Pembaruan Berkas `src/lib/prisma.ts`

Kita akan mengganti adapter TCP bawaan dengan HTTP Serverless Driver dari `@tidbcloud/serverless`. Driver ini akan melakukan pool koneksi terkelola langsung di infrastruktur cloud TiDB lewat API RESTful yang sangat efisien dan instan.

**Draf Perubahan Kode di `src/lib/prisma.ts`:**

```typescript
import { PrismaClient } from "@prisma/client";
import { connect } from "@tidbcloud/serverless";
import { PrismaTiDBCloud } from "@tidbcloud/prisma-adapter";
import "dotenv/config";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Menginisialisasi koneksi HTTP Serverless Driver terkelola
const client = connect({
  url: process.env.DATABASE_URL, // Menggunakan URL HTTP TiDB
});

// Memasang HTTP Driver ke Prisma Adapter
const adapter = new PrismaTiDBCloud(client);

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
```

### Tahap 3: Pembaruan Konfigurasi di `.env`

Format URL database MySQL tradisional akan diganti menggunakan format URL API REST dari TiDB Cloud:

```text
# FORMAT DATABASE URL LAMA (TCP):
# DATABASE_URL="mysql://username:password@gateway01.ap-southeast-1.prod.alicloud.tidbcloud.com:4000/test?sslaccept=strict"

# FORMAT DATABASE URL BARU (HTTP):
DATABASE_URL="https://username:password@gateway01.ap-southeast-1.prod.alicloud.tidbcloud.com/test"
```

---

## 4. Dependencies (Ketergantungan Paket)

- `@tidbcloud/serverless` (Wajib - Driver resmi HTTP TiDB)
- `@tidbcloud/prisma-adapter` (Wajib - Adapter penghubung TiDB Serverless dengan Prisma ORM)

---

## 5. Edge Cases & Error Handling (Penanganan Kasus Khusus)

1.  **Keterbatasan Transaksi Panjang:**
    - _Masalah:_ HTTP Driver dirancang untuk query cepat stateless. Transaksi multi-query yang sangat lama mungkin mengalami timeout di level HTTP.
    - _Solusi:_ Penulisan jawaban CBT di `/api/exams/submit` menggunakan transaksi atomik cepat (`prisma.$transaction`), yang dipastikan berjalan lancar dalam hitungan milidetik di bawah HTTP Driver.
2.  **Perbedaan di Lingkungan Pengembangan Lokal (Local Development):**
    - _Masalah:_ HTTP Driver TiDB memerlukan koneksi internet aktif ke TiDB Cloud. Jika Anda mengembangkan aplikasi secara luring (_offline_) di laptop menggunakan database MySQL lokal, HTTP driver ini tidak dapat berjalan.
    - _Solusi:_ Di `src/lib/prisma.ts`, kita akan membuat percabangan logika deteksi otomatis (_fallback_). Jika aplikasi mendeteksi URL localhost (`localhost` / `127.0.0.1`), PrismaClient akan diinstansiasi secara otomatis menggunakan driver TCP konvensional biasa tanpa adapter HTTP.
