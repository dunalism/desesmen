# 📝 Perencanaan CBT Tahap 3: UI Manajemen Sesi Ujian (Dashboard Guru)

Dokumen ini menjelaskan rencana implementasi teknis untuk Tahap 3 pengembangan fitur CBT (Computer Based Test).

## 1. Objective

Membangun antarmuka manajemen CBT bagi Guru agar dapat melihat daftar sesi ujian aktif/nonaktif, membuat sesi ujian baru melalui formulir modal, menyalin token ujian dengan mudah, menutup sesi ujian secara paksa, serta menghapus sesi ujian beserta berkas statis JSON-nya.

---

## 2. Affected Files

Berikut adalah daftar berkas yang akan dibuat atau dimodifikasi:

- [ ] `src/app/api/exams/route.ts` _(Modifikasi)_ - Menambahkan GET handler untuk mengambil daftar sesi ujian milik user.
- [ ] `src/app/api/exams/[id]/route.ts` _(Berkas Baru)_ - Menangani PATCH (menutup ujian) dan DELETE (menghapus sesi ujian dan file static JSON-nya).
- [ ] `src/app/dashboard/exams/page.tsx` _(Berkas Baru)_ - Halaman antarmuka utama manajemen ujian bagi Guru.
- [ ] `planning/cbt-feature-roadmap.md` _(Status update)_ - Menandai Tahap 3 sebagai selesai setelah verifikasi berhasil.

---

## 3. Implementation Steps

### A. Tambahkan GET Handler di `src/app/api/exams/route.ts`

- Menerima `userId` dari query parameter.
- Melakukan query ke database TiDB untuk mengambil seluruh sesi ujian (`Exam`) yang terhubung dengan paket soal (`Assessment`) milik `userId` tersebut:
  ```typescript
  const exams = await prisma.exam.findMany({
    where: {
      assessment: {
        userId: userId,
      },
    },
    include: {
      assessment: {
        select: {
          title: true,
          questionCount: true,
          questionType: true,
        },
      },
      _count: {
        select: {
          attempts: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  ```
- Mengembalikan array daftar sesi ujian dalam respon JSON.

### B. Buat API Endpoint Baru `src/app/api/exams/[id]/route.ts`

- **PATCH**:
  - Menerima `isActive` (boolean) dalam request body.
  - Memperbarui status `isActive` sesi ujian di database.
- **DELETE**:
  - Mengambil data token sesi ujian terlebih dahulu untuk menghapus berkas statis terkait di `/public/exams/[token].json`.
  - Menghapus sesi ujian dari database (dengan cascade, semua percobaan siswa juga akan terhapus otomatis di level DB).
  - Menghapus file statis menggunakan `fs.unlinkSync` jika ada.

### C. Buat Halaman Dashboard `src/app/dashboard/exams/page.tsx`

Halaman ini adalah halaman Client Component (`"use client"`) yang terintegrasi dengan Firebase Auth dan SWR.

1. **State & Fetching**:
   - Memantau auth dengan `onAuthStateChanged`.
   - Mengambil data daftar ujian dengan SWR: `/api/exams?userId=${userId}`.
   - Mengambil data daftar paket soal (`Assessment`) milik guru: `/api/assessments?userId=${userId}&limit=100` untuk pilihan dropdown saat membuat sesi baru.
2. **Layout Utama**:
   - Desain dashboard clean & modern menggunakan Tailwind, Cards, dan Lucide icons.
   - Header halaman berisi judul dan tombol **"+ Buat Ujian CBT Baru"**.
3. **Modal Form Pembuatan Ujian Baru**:
   - Dialog/Modal pop-up menggunakan Shadcn-like dialog atau markup Tailwind interaktif yang andal.
   - Form input:
     - Dropdown Pilihan Paket Soal (`Assessment`).
     - Judul Ujian (mengisi otomatis jika paket soal dipilih, bisa diedit kustom).
     - Durasi (menit).
     - Waktu Mulai & Waktu Selesai (input datetime lokal).
     - Switch/Checkbox Toggles:
       - Tampilkan Papan Peringkat (`showLeaderboard`).
       - Acak Soal (`shuffleQuestions`).
       - Acak Opsi Pilihan Ganda (`shuffleOptions`).
   - Melakukan submit POST ke `/api/exams`, menutup modal, me-mutate SWR cache, dan memunculkan Alert sukses.
4. **Tampilan Daftar Kartu Sesi Ujian (Exam Cards)**:
   - Jika belum ada sesi ujian, tampilkan ilustrasi/state kosong yang cantik.
   - Untuk setiap sesi ujian, tampilkan kartu yang berisi:
     - Status badge: **"Aktif"** (hijau jika `isActive` true dan waktu saat ini di antara start/end), atau **"Selesai/Ditutup"** (abu-abu/merah).
     - Judul Ujian dan nama Paket Soal asal.
     - **Token Ujian**: Ditampilkan besar, menonjol, dan dilengkapi tombol "Salin Token" dengan umpan balik salin (toast/alert).
     - Detail detail: Durasi, Jadwal Mulai & Selesai, Jumlah Soal, Jumlah Siswa Mengikuti (`attempts`).
     - Pengaturan aktif: Indikator ikon/badge kecil jika pengacakan soal/opsi atau papan peringkat diaktifkan.
     - Area Tombol Aksi:
       - Tombol **"Tutup Ujian"** (hanya aktif jika status ujian sedang Aktif): Mengubah status `isActive` menjadi false via PATCH.
       - Tombol **"Lihat Hasil"**: Mengarah ke halaman hasil ujian siswa di `/dashboard/exams/[id]/results`.
       - Tombol **"Hapus"**: Membuka Dialog konfirmasi keamanan, lalu menembak DELETE jika disetujui.

---

## 4. Dependencies

Kita akan menggunakan komponen standard yang sudah ada di repo:

- SWR & Fetcher (`useSWR` & `@/lib/fetcher`).
- `useDialog` dari `@/components/ui/dialog-provider` untuk pop-up konfirmasi dan alert yang seragam.
- Lucide Icons (`Clipboard`, `Trash2`, `Play`, `Square`, `Users`, `Calendar`, `Clock`, `Settings`, `AlertTriangle`, `Copy`, `Check`).

---

## 5. Edge Cases & Error Handling

- **Ujian Kadaluarsa Otomatis**: Secara UI, status ujian akan ditampilkan sebagai "Selesai" jika waktu saat ini sudah melewati `endTime`, meskipun properti `isActive` bernilai true.
- **Validasi Waktu Form**: Waktu mulai tidak boleh lebih besar dari waktu selesai. Waktu mulai juga disarankan tidak lebih lampau dari waktu sekarang.
- **Penghapusan File Statis**: Jika file static JSON tidak ditemukan di server saat proses DELETE, API akan mengabaikan kesalahan I/O tersebut dan tetap menghapus record di DB agar tidak terjadi kebuntuan (_hang_).
- **Penanganan Input Kosong**: Menampilkan pesan error validasi langsung di modal form sebelum menembak request ke server.

---

## 6. Contoh Rancangan Desain Antarmuka

```text
+-----------------------------------------------------------------------------+
|  Dashboard > CBT Exams                                       [+ Buat Ujian] |
|  Kelola ujian mandiri dengan arsitektur efisien 0 Rupiah                    |
+-----------------------------------------------------------------------------+
|  [ Sesi Ujian Aktif ]                       [ Sesi Ujian Selesai ]          |
|  +---------------------------------------+  +----------------------------+  |
|  | Kuis Harian Matematika (MAT7X2) [Aktif]|  | Kuis Fisika (FIS3W1) [Sls] |  |
|  | Paket: Aljabar Linear | 10 Soal       |  | Paket: Optika Gelombang    |  |
|  |                                       |  |                            |  |
|  | TOKEN:  [  MAT7X2  ] (Salin)          |  | Token: FIS3W1              |  |
|  |                                       |  |                            |  |
|  | Durasi: 45 Menit | Siswa: 12 org      |  | Siswa: 28 org | Skor: 78.5 |  |
|  | Mulai : 25 Jun 2026, 08:00            |  | Selesai: 24 Jun 2026       |  |
|  | Selesai: 25 Jun 2026, 12:00           |  |                            |  |
|  |                                       |  |                            |  |
|  | (⚙️ Acak Soal, Acak Opsi)              |  |                            |  |
|  |                                       |  |                            |  |
|  | [Tutup Ujian] [Lihat Hasil] [Hapus]   |  | [Lihat Hasil] [Hapus]      |  |
|  +---------------------------------------+  +----------------------------+  |
+-----------------------------------------------------------------------------+
```
