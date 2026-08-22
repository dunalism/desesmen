# Rencana Perbaikan Bug: Siswa Berhasil Submit CBT tapi Nilai Tidak Masuk Rekap (Missing Student Attempts)

## 1. Analisis Bug & Penyebab Utama (Root Cause)

### Masalah yang Terjadi:

Saat ujian CBT berlangsung (baik saat diuji menggunakan alat pengujian beban seperti `k6` maupun saat digunakan oleh siswa asli), beberapa siswa berhasil menyelesaikan ujian dan diarahkan ke halaman sukses (`/cbt/success`). Namun, di dashboard guru (rekap nilai), data pengerjaan siswa tersebut **tidak ada** (hilang dari rekap).

### Analisis Kode & Aliran Data:

1. **Penyebab Database Reject**:
   Di dalam `prisma/schema.prisma`, terdapat batasan unik (_unique constraint_) pada model `ExamAttempt`:

   ```prisma
   @@unique([examId, studentId])
   ```

   Batasan ini mengasumsikan bahwa `studentId` (Nomor Absen / ID Siswa) harus sepenuhnya unik untuk setiap sesi ujian (`examId`).

2. **Dampak Duplikasi `studentId`**:
   Di sekolah, Nomor Absen siswa sangat umum berulang (misalnya kelas 9A dan kelas 9B sama-sama memiliki siswa dengan Nomor Absen `1`, `2`, `3`, dst., tetapi nama mereka berbeda, misalnya Budi di 9A dan Andi di 9B).
   - Siswa pertama (Budi, ID: "1") mengirim lembar jawaban -> Berhasil disimpan di database.
   - Siswa kedua (Andi, ID: "1") mengirim lembar jawaban -> Ditolak oleh TiDB Database karena adanya pelanggaran _unique constraint_ `@@unique([examId, studentId])`.

3. **Ilusi Sukses pada Browser Siswa**:
   Ketika database menolak pengiriman Andi, API `/api/exams/submit` menangkap kesalahan duplikasi entri (_Duplicate Entry_) dan mengembalikan respons HTTP `409 Conflict` dengan pesan `"Jawaban Anda sudah tersimpan sebelumnya."`.

   Di sisi klien (`src/app/cbt/[token]/page.tsx` baris 731-761), terdapat penanganan khusus untuk pesan `"sudah tersimpan"` untuk menangani kasus putus koneksi/pengiriman ulang:

   ```typescript
   if (errMsg.includes("sudah tersimpan")) {
     showAlert(
       "Sudah Tersimpan",
       "Jawaban Anda untuk ujian ini sudah tersimpan...",
     );
     // ... update status COMPLETED di Firestore ...
     localStorage.clear();
     sessionStorage.clear();
     setIsSuccess(true);
     router.push("/cbt/success");
   }
   ```

   **Di sinilah celah bug unik ini terjadi**: Andi (Siswa kedua) mengira ujiannya berhasil terkirim karena browser menampilkan pesan sukses dan mengarahkannya ke `/cbt/success`. Padahal, di database TiDB, data ujian Andi **tidak pernah tersimpan** karena diblokir oleh unique constraint tersebut!

---

## 2. Solusi yang Diusulkan

Kita harus memperluas batasan unik (_unique constraint_) di database agar mengidentifikasi siswa secara unik berdasarkan **kombinasi `examId` + `studentId` + `studentName`**.

Siswa yang berbeda (misalnya ID "1" nama Budi dan ID "1" nama Andi) akan memiliki kombinasi yang unik, sehingga keduanya bisa submit dengan sukses. Batasan unik ini hanya akan memicu duplikasi (respons `409`) jika siswa yang **sama persis** (nama dan ID yang sama) mencoba melakukan submit ulang.

### File yang Terpengaruh (Affected Files):

- [ ] `prisma/schema.prisma`: Mengubah batasan unik dari `@@unique([examId, studentId])` menjadi `@@unique([examId, studentId, studentName])`.

---

## 3. Langkah-Langkah Implementasi (Implementation Steps)

### Langkah 1: Ubah Skema Prisma

Buka `prisma/schema.prisma` dan ubah definisi `@@unique` di model `ExamAttempt`:

```prisma
// SEBELUM
@@unique([examId, studentId])

// SESUDAH
@@unique([examId, studentId, studentName])
```

### Langkah 2: Sinkronisasi Database Skema & Regenerate Client

Jalankan perintah sinkronisasi skema ke TiDB Cloud dan generate ulang Prisma client agar perubahan terbaca oleh Next.js:

```powershell
npx prisma db push; npx prisma generate
```

### Langkah 3: Verifikasi Kode API

Verifikasi bahwa API `/api/exams/submit/route.ts` masih menangkap error _Duplicate entry_ dengan benar ketika siswa yang sama persis mencoba melakukan pengiriman ganda. Karena kita tidak mengubah logika penangkapan error di API, penangkapan ini akan bekerja secara otomatis dengan kriteria keunikan yang baru.

---

## 4. Antisipasi Kasus Khusus & Penanganan Error (Edge Cases)

1. **Nama Siswa Memiliki Spasi Tambahan**:
   Di halaman login (`/cbt`), nama dan ID siswa telah di-trim menggunakan `.trim()`. Di API submit, nama dan ID siswa juga secara ketat di-trim (`trimmedName`, `trimmedStudentId`). Hal ini menjamin konsistensi keunikan string nama tanpa terganggu oleh spasi yang tidak disengaja.
2. **Siswa Mengisi studentId Kosong**:
   Di form login, `studentId` bersifat wajib (`required`). Namun jika di database kolom tersebut bernilai `null` (opsional di skema), dalam MySQL/TiDB nilai `null` di dalam unique constraint multi-kolom diperbolehkan duplikat, sehingga tidak akan memblokir pengiriman siswa lain.

---

## 5. Kriteria Keberhasilan (Success Criteria)

- [ ] Skema database berhasil diperbarui menjadi `@@unique([examId, studentId, studentName])`.
- [ ] Dua siswa dengan Nomor Absen (`studentId`) yang sama (misalnya `"1"`) tetapi memiliki Nama Lengkap (`studentName`) yang berbeda (misalnya `"Andi"` dan `"Budi"`) dapat mengirimkan lembar jawaban secara bersamaan tanpa memicu error `409` atau kegagalan database.
- [ ] Kedua siswa tersebut muncul dengan lengkap beserta nilainya masing-masing di rekap nilai dashboard guru.
- [ ] Pengiriman ganda oleh siswa yang **sama persis** (nama dan ID sama) tetap diblokir dengan benar oleh pengaman `409` demi mencegah data ganda.
