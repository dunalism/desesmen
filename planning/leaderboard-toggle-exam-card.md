# Rencana Perubahan: Toggle Leaderboard pada ExamCard

## 1. Objective (Tujuan)
Menambahkan fitur *toggle* interaktif pada kartu sesi ujian guru (`ExamCard`) untuk mengaktifkan atau menonaktifkan status `showLeaderboard` secara real-time. Dengan fitur ini, Guru dapat menyalakan/mematikan tampilan papan peringkat publik secara dinamis tanpa harus menghapus atau membuat ulang sesi ujian. Logika backend pada API rute juga akan diperbarui untuk mendukung perubahan properti `showLeaderboard` ini.

## 2. Affected Files (Berkas yang Terpengaruh)
- `src/components/dashboard/exams/ExamCard.tsx` (Menambahkan tombol/toggle interaktif dan memanggil API PATCH)
- `src/app/api/exams/[id]/route.ts` (Memperbarui API PATCH agar dapat menerima dan mengupdate `showLeaderboard`)
- `src/app/dashboard/exams/page.tsx` (Mengintegrasikan handler update di level halaman jika diperlukan, namun untuk kemudahan dan performa optimal, kita bisa meletakkan handler update langsung di dalam `ExamCard` atau meneruskannya sebagai prop callback. Mengingat `onToggleActive` dilewatkan dari luar dan memanfaatkan `mutateExams()`, kita akan menambahkan callback baru `onToggleLeaderboard` ke `ExamCardProps` atau mendefinisikan handler lokal di dalam `ExamCard` dengan memanggil mutasi SWR/pembaruan state eksternal. Agar konsisten dengan pattern `onToggleActive`, kita akan menambahkan prop `onToggleLeaderboard: (id: string, currentStatus: boolean) => void` pada `ExamCardProps` dan mendefinisikannya di `src/app/dashboard/exams/page.tsx`).

## 3. Implementation Steps (Langkah-Langkah Implementasi)

### A. Backend - API Route (`src/app/api/exams/[id]/route.ts`)
1. Buka `src/app/api/exams/[id]/route.ts`.
2. Pada fungsi `PATCH`, perbarui ekstraksi variabel dari JSON body. Terima properti `showLeaderboard` yang bersifat opsional.
3. Konstruksikan objek `data` untuk Prisma update secara dinamis:
   ```typescript
   const updateData: any = {};
   if (isActive !== undefined) updateData.isActive = !!isActive;
   if (showLeaderboard !== undefined) updateData.showLeaderboard = !!showLeaderboard;
   ```
4. Pastikan validasi bahwa setidaknya ada salah satu parameter (`isActive` atau `showLeaderboard`) yang dikirimkan.
5. Jalankan revalidasi cache Next.js jika terjadi pembaruan.

### B. Frontend - Integrasi di Halaman Utama Dashboard (`src/app/dashboard/exams/page.tsx`)
1. Tambahkan fungsi handler baru `handleToggleLeaderboard(id: string, currentStatus: boolean)` serupa dengan `handleToggleActive`.
2. Kirim fetch `PATCH` ke `/api/exams/${id}` dengan payload `{ showLeaderboard: !currentStatus }`.
3. Gunakan `mutateExams()` untuk memicu penyegaran SWR.
4. Teruskan prop `onToggleLeaderboard` ke komponen `<ExamCard />`.

### C. Frontend - Desain Komponen `ExamCard` (`src/components/dashboard/exams/ExamCard.tsx`)
1. Tambahkan prop `onToggleLeaderboard` ke dalam `ExamCardProps` interface.
2. Tambahkan tombol toggle baru di dalam menu header kartu ujian (di samping tombol Play/Square), menggunakan ikon Lucide `Trophy` atau ikon relevan.
3. Tampilkan ikon dengan *style* berbeda berdasarkan status `exam.showLeaderboard` (misal, warna kuning emas `text-amber-500 fill-amber-500/10` jika aktif, dan abu-abu redup jika dinonaktifkan).
4. Tambahkan *tooltip* atau judul ("Aktifkan Papan Peringkat" / "Matikan Papan Peringkat").
5. Saat tombol diklik, panggil `onToggleLeaderboard(exam.id, exam.showLeaderboard)`.

## 4. Dependencies (Ketergantungan)
Tidak ada pustaka pihak ketiga baru yang perlu diinstal.

## 5. Edge Cases & Error Handling (Kasus Batas & Penanganan Error)
- Menangani loading state saat pengiriman request toggle agar tidak terjadi double-clicking.
- Memastikan kembalinya response yang valid dari API.
