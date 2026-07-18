# Rencana Implementasi Client-Side Caching SWR pada Dashboard

Dokumen perencanaan ini dibuat untuk mengimplementasikan strategi client-side caching menggunakan SWR pada halaman Beranda Dashboard (`src/app/dashboard/page.tsx`) dan menghapus kode-kode lama yang tidak lagi diperlukan, tanpa merusak fungsionalitas yang ada.

## 1. Objective (Tujuan)

- **Migrasi Mechanism Fetching ke SWR:** Mengganti hook `useEffect` dan fetch manual di halaman dashboard dengan `useSWR` untuk memuat data statistik (`stats`) dan riwayat pembuatan terakhir (`recentAssessments`).
- **Pembersihan Kode (Clean Code):** Menghapus fungsi dan state yang menjadi redundan setelah migrasi ke SWR (seperti fungsi `fetchDashboardData` manual, status `loading` manual, dsb.).
- **Optimistic Updates pada Deletion:** Memastikan penghapusan paket soal dari riwayat terakhir tetap berjalan lancar dan mengupdate SWR cache secara optimis di client sebelum server mengonfirmasi responnya.

## 2. Affected Files (Berkas yang Terpengaruh)

- [ ] `src/app/dashboard/page.tsx` (Refaktor fetching dengan SWR dan pembersihan kode)

## 3. Implementation Steps (Langkah-Langkah Implementasi)

### Langkah 1: Integrasi useSWR di Dashboard

Kita akan memanggil hook `useSWR` untuk endpoint statistik dashboard:

```typescript
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";

const { data, error, isLoading, mutate } = useSWR(
  userId ? `/api/dashboard/stats?userId=${userId}` : null,
  fetcher,
);
```

Data dari endpoint `/api/dashboard/stats` mengembalikan `{ success: true, stats, recentAssessments }`.
Sehingga, kita bisa mendelegasikan data tersebut langsung di UI:

- `stats`: `data?.stats`
- `recentAssessments`: `data?.recentAssessments || []`

### Langkah 2: Pembersihan Kode yang Tidak Diperlukan (Redundan)

Menghapus blok-blok kode berikut:

- State `loading` manual (`const [loading, setLoading] = useState(true);`).
- Fungsi `fetchDashboardData` manual yang menggunakan `useCallback` dan `fetch` konvensional.
- Sinkronisasi manual stats & assessments di `useEffect` auth listener.

### Langkah 3: Optimistic Update pada Fungsi Hapus (`handleDeleteAssessment`)

Ketika paket soal dihapus, kita panggil `mutate()` dari SWR secara lokal sehingga card tersebut langsung ter-filter keluar dari `recentAssessments` secara instan:

```typescript
if (data) {
  mutate(
    {
      ...data,
      recentAssessments: data.recentAssessments.filter(
        (item: Assessment) => item.id !== id,
      ),
    },
    false, // Jangan langsung fetch ulang, percayai state client sementara
  );
}
```

---

## Pernyataan Persetujuan

Apakah rencana ini sudah sesuai dengan ekspektasi Anda? Silakan balas dengan **"lanjut"**, **"ok"**, atau **"eksekusi"** untuk memulai pengerjaan!
