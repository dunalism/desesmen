# 🏆 Rencana Implementasi: Tahap 8 - Halaman Leaderboard Publik (Siswa)

## 1. Objective (Tujuan)

Mengimplementasikan fitur papan peringkat (leaderboard) publik untuk siswa secara lengkap dan andal. Fitur ini memungkinkan siswa melihat daftar ujian yang sudah selesai (nonaktif) yang diperbolehkan untuk menampilkan leaderboard, serta melihat papan peringkat detail dari ujian tersebut dengan podium interaktif/visual untuk 3 besar dan tabel peringkat susulan di bawahnya. Semua halaman diakses secara publik (tanpa login Firebase) agar menghemat Request Units (RU) database dan performa sistem.

## 2. Affected Files (Berkas yang Terpengaruh)

- `planning/cbt-tahap-8-leaderboard.md` (Berkas rencana - BARU)
- `src/app/api/leaderboards/route.ts` (Endpoint API daftar leaderboard - BARU)
- `src/app/api/leaderboards/[token]/route.ts` (Endpoint API detail leaderboard berdasarkan token - BARU)
- `src/app/leaderboard/page.tsx` (Halaman utama daftar leaderboard - BARU)
- `src/app/leaderboard/[token]/page.tsx` (Halaman detail leaderboard sesi ujian - BARU)

## 3. Implementation Steps (Langkah-Langkah Implementasi)

### A. Backend - API Route Leaderboards

1. **`GET /api/leaderboards`**:
   - Menarik semua data `Exam` dari database yang memiliki:
     - `isActive: false` (Ujian sudah ditutup oleh Guru).
     - `showLeaderboard: true` (Guru mengizinkan leaderboard ditampilkan).
   - Menyertakan data relasi `assessment` untuk mendapatkan judul/detail dan jumlah soal, atau menyertakan count `attempts`.
   - Mengurutkan berdasarkan `endTime` menurun (DESC) agar ujian terbaru yang selesai berada di paling atas.
   - Menggunakan singleton `prisma` dari `@/lib/prisma`.
2. **`GET /api/leaderboards/[token]`**:
   - Menerima parameter `token` (case-insensitive, diubah menjadi `.toUpperCase()`).
   - Mencari entitas `Exam` berdasarkan `token` unik tersebut.
   - Jika ujian tidak ditemukan atau `showLeaderboard === false` atau `isActive === true`, kembalikan respons error 404/403 yang sesuai.
   - Jika valid, tarik data `ExamAttempt` yang terhubung dengan `examId` tersebut.
   - Urutkan data pengerjaan (`ExamAttempt`) berdasarkan:
     - `score` menurun (DESC) - prioritas utama.
     - `durationSeconds` menaik (ASC) - prioritas kedua (jika skor sama, waktu pengerjaan lebih cepat adalah pemenang).
   - Format respons JSON dengan struktur yang rapi, termasuk informasi `Exam` dan daftar `attempts` berurut.

### B. Frontend - Halaman Leaderboard Utama (`/leaderboard/page.tsx`)

1. Menggunakan `"use client"` dan SWR (`useSWR` dari `swr`) untuk data fetching dari `/api/leaderboards`.
2. Menyediakan header bertema yang keren dan tombol navigasi kembali ke halaman utama atau CBT (`/cbt`).
3. Menampilkan daftar ujian yang sudah selesai dalam bentuk Grid Card menggunakan komponen `@/components/ui/card`.
4. Menyediakan informasi penting pada setiap card: Judul Ujian, Tanggal Selesai, Jumlah Soal, Jumlah Siswa Berpartisipasi.
5. Tombol "Lihat Papan Peringkat" yang mengarahkan ke `/leaderboard/[token]`.
6. Menampilkan state loading skeleton atau pesan kosong yang ramah jika belum ada ujian selesai.

### C. Frontend - Halaman Detail Leaderboard (`/leaderboard/[token]/page.tsx`)

1. Menggunakan `"use client"` dan `useSWR` dari `/api/leaderboards/[token]`.
2. **Komponen Visual 3 Blok Podium (Top 3)**:
   - Membuat tata letak baris flex/grid untuk podium: Juara 2 (Perak - Kiri), Juara 1 (Emas - Tengah, paling tinggi), Juara 3 (Perunggu - Kanan).
   - Blok Juara 1 disorot khusus dengan warna latar `bg-amber-500/10`, border `border-amber-500`, dan teks `text-amber-600 dark:text-amber-400`, serta mahkota emas atau ikon bintang.
   - Blok Juara 2 dengan `bg-slate-400/10`, border `border-slate-400`, teks `text-slate-500`.
   - Blok Juara 3 dengan `bg-orange-600/10`, border `border-orange-600`, teks `text-orange-700`.
   - Menampilkan Nama Siswa, Skor, dan Waktu Pengerjaan (diformat dengan rapi) pada masing-masing blok.
3. **Tabel Peringkat 4 dst**:
   - Menggunakan `@/components/ui/table` untuk merender baris zebra (`even:bg-muted/40`).
   - Kolom: Peringkat, Nama Siswa, No Absen/ID, Durasi, Skor.
4. Menambahkan fungsionalitas tombol kembali ke daftar ujian (`/leaderboard`).

## 4. Dependencies (Ketergantungan)

- Tidak ada package eksternal baru yang perlu diinstal. Kita menggunakan komponen UI bawaan (seperti `Card`, `Table`, `Button`) dan `lucide-react` untuk ikon.

## 5. Edge Cases & Error Handling (Kasus Batas & Penanganan Error)

- **Token tidak valid / tidak ditemukan**: Menampilkan pesan error 404 dengan ilustrasi menarik dan tombol kembali.
- **Ujian masih aktif / Leaderboard disembunyikan**: Jika ada siswa mencoba menebak URL token untuk ujian yang masih aktif atau dilarang guru, API mengembalikan error dan frontend merespons dengan menampilkan pesan larangan.
- **Siswa dengan skor & waktu yang persis sama**: Peringkat akan dihitung berdasarkan urutan alami, namun visualisasi peringkat/tabel tetap mempertahankan baris pengerjaan masing-masing tanpa error.
- **Belum ada pengerjaan**: Jika ujian telah berakhir tetapi tidak ada siswa yang mengikutinya, tampilkan state kosong ("Belum ada siswa yang menyelesaikan ujian ini") tanpa memecah render podium.
