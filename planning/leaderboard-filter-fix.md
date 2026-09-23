# Rencana Perubahan: Menampilkan Leaderboard Berdasarkan Status `showLeaderboard`

## 1. Objective (Tujuan)
Mengubah logika penyaringan papan peringkat (leaderboard) agar penampilannya hanya bergantung pada properti `showLeaderboard: true`. Sebelumnya, leaderboard hanya ditampilkan jika ujian sudah ditutup (`isActive: false` dan `showLeaderboard: true`). Dengan perubahan ini, baik ujian masih aktif (`isActive: true` atau `isActive: false`) maupun sudah selesai atau belum, papan peringkat akan tetap muncul selama Guru mengaktifkan opsi papan peringkat publik (`showLeaderboard: true`).

## 2. Affected Files (Berkas yang Terpengaruh)
- `src/app/api/leaderboards/route.ts` (Mengubah filter query Prisma agar tidak membatasi `isActive: false`)
- `src/app/leaderboard/page.tsx` (Menyesuaikan jika ada teks panduan atau logika tampilan di client side yang bergantung pada status aktif/selesainya ujian)

## 3. Implementation Steps (Langkah-Langkah Implementasi)

### A. Backend - API Route (`src/app/api/leaderboards/route.ts`)
1. Buka file `src/app/api/leaderboards/route.ts`.
2. Pada pemanggilan query Prisma `prisma.exam.findMany`, ubah objek filter `where`.
3. Hapus filter `isActive: false`, sehingga filter hanya tersisa `showLeaderboard: true`.
4. Pastikan `orderBy` tetap mengurutkan berdasarkan `endTime: "desc"` (atau `startTime: "desc"`, namun `endTime: "desc"` sudah sangat baik agar ujian terbaru/yang akan selesai dalam waktu dekat berada di paling atas).

### B. Frontend - Daftar Leaderboard (`src/app/leaderboard/page.tsx`)
1. Periksa apakah ada filter di sisi client atau teks deskripsi yang membatasi tampilan berdasarkan status aktif.
2. Pada baris 179-183 (atau bagian render kartu ujian):
   - Jika ujian sedang aktif atau belum selesai, tampilkan informasi yang sesuai (misalnya, jika `isActive: true` atau belum melewati `endTime`, tunjukkan penanda "Ujian Sedang Berlangsung" atau sisa waktu).
   - Teks deskripsi saat data kosong:
     _Sebelumnya:_ `"Saat ini belum ada sesi ujian yang ditutup atau diizinkan memiliki papan peringkat."`
     _Sesuaikan dengan:_ `"Saat ini belum ada sesi ujian yang diizinkan memiliki papan peringkat publik."` (karena tidak lagi harus ditutup).

## 4. Dependencies (Ketergantungan)
Tidak ada pustaka baru yang perlu diinstal.

## 5. Edge Cases & Error Handling (Kasus Batas & Penanganan Error)
- **Ujian Belum Memiliki Peserta:** Jika ujian baru saja aktif dan belum ada siswa yang mengirimkan jawaban (`attempts` bernilai 0), halaman detail leaderboard (`/leaderboard/[token]`) akan menampilkan podium kosong atau pesan bahwa belum ada siswa yang melakukan submit. Ini sudah di-handle dengan baik oleh halaman detail.
- **Waktu Mulai/Selesai:** Jika ujian sedang aktif, siswa dapat memantau peringkat secara real-time. Ini sangat interaktif dan memberikan feedback langsung.
