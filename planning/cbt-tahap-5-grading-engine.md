# 🗺️ Perencanaan CBT Tahap 5: Keamanan & Server-Side Grading Engine

## 1. Objective (Tujuan)

Mengimplementasikan API Route penerimaan jawaban siswa (`POST /api/exams/submit`) yang aman dari kecurangan, memiliki toleransi latensi jaringan, mencegah pengumpulan ganda (anti double-submit), serta melakukan penilaian otomatis (autograding) secara aman di sisi server untuk jenis soal Pilihan Ganda (MULTIPLE_CHOICE) dan Benar/Salah (TRUE_FALSE), sementara untuk Isian Singkat (SHORT_ANSWER) dan Menjodohkan (MATCHING) disiapkan untuk penilaian manual/otomatis tingkat lanjut tanpa mengekspos kunci jawaban ke sisi client. Penyimpanan data hasil ujian diselesaikan dalam satu transaksi atomik database (`prisma.$transaction`) demi menjaga efisiensi penggunaan Request Units (RU) TiDB Serverless dan integritas data.

## 2. Affected Files (Berkas yang Terpengaruh)

- `src/app/api/exams/submit/route.ts` (Akan dibuat baru)

## 3. Implementation Steps (Langkah-Langkah Implementasi)

1. **Membuat Direktori & Berkas Baru**:
   - Membuat folder `src/app/api/exams/submit` jika belum ada.
   - Membuat file `route.ts` di dalam folder tersebut.

2. **Membuat Logika Validasi & Grading di `route.ts`**:
   - **Parser Payload**: Menerima JSON body sesuai format:
     ```json
     {
       "studentName": "Nama Siswa",
       "studentId": "NISN/No Absen",
       "examToken": "TOKEN-UJIAN",
       "answers": [
         {
           "questionId": "uuid-soal",
           "chosenOptionId": "uuid-opsi-atau-null",
           "textAnswer": "string-atau-null"
         }
       ]
     }
     ```
   - **Validasi Kehadiran Input**: Validasi bahwa `studentName`, `examToken`, dan `answers` tidak boleh kosong.
   - **Membaca Data Ujian (`Exam`) & Kunci Jawaban**: Tarik data `Exam` beserta seluruh soal (`questions`) dan opsi jawaban (`options`) dalam satu kueri Prisma berdasarkan `examToken`.
   - **Validasi 1 (Status Aktif)**: Jika `exam.isActive === false`, tolak pengiriman dengan status `403 Forbidden` ("Ujian sudah ditutup").
   - **Validasi 2 (Batas Waktu pengerjaan)**: Bandingkan waktu server `new Date()` dengan `exam.endTime`. Berikan dispensasi waktu (_grace period_) sebesar **60 detik** untuk toleransi keterlambatan pengiriman data internet lambat. Jika terlampaui, kembalikan status `403 Forbidden` ("Waktu pengerjaan ujian telah berakhir").
   - **Validasi 3 (Anti Double-Submit)**: Cek tabel `ExamAttempt` untuk kombinasi `examId` + `studentId` + `studentName`. Jika sudah ada, tolak dengan status `409 Conflict` ("Jawaban Anda sudah tersimpan sebelumnya").
   - **Logika Autograding (Server-side)**:
     - Inisialisasi `score = 0` dan `correctCount = 0`.
     - Hitung total soal yang akan dijadikan pembagi nilai (misal total soal bertipe `MULTIPLE_CHOICE` dan `TRUE_FALSE`).
     - Lakukan iterasi untuk setiap jawaban siswa:
       - Cari soal yang cocok di database.
       - Jika soal bertipe `MULTIPLE_CHOICE`:
         - Cari opsi jawaban di database untuk `questionId` terkait yang memiliki `isCorrect === true`.
         - Jika `chosenOptionId` siswa sama dengan ID opsi yang benar tersebut, set status `isCorrect` jawaban tersebut menjadi `true`, dan tambahkan `correctCount`. Jika tidak, set `false`.
       - Jika soal bertipe `TRUE_FALSE`:
         - Bandingkan `textAnswer` siswa secara _case-insensitive_ (`.toLowerCase().trim()`) dengan `answerKey` di database (bisa bernilai 'benar' atau 'salah').
         - Jika sama, set status `isCorrect` menjadi `true`, dan tambahkan `correctCount`. Jika tidak, set `false`.
       - Jika soal bertipe `SHORT_ANSWER` atau `MATCHING`:
         - Untuk `SHORT_ANSWER`, kita bisa mencocokkan secara case-insensitive & trim dengan `answerKey` di database untuk penilaian otomatis dasar. Namun, jika instruksi meminta diset status awal `isGraded: false` karena membutuhkan koreksi manual, kita akan menyesuaikannya. Di sini kita akan membuat penilaian dasar otomatis case-insensitive untuk `SHORT_ANSWER` (jika cocok set `true`, jika tidak tetap simpan namun bisa disesuaikan nanti) atau set bawaan `false`/`null` dengan status `isCorrect` bernilai `null` / `false`. Sesuai panduan roadmap, `SHORT_ANSWER` & `MATCHING` secara bawaan diset status awal benar/salah sebagai `false` (atau `isCorrect` bisa diset `false` dahulu dan lembar pengerjaan tetap ditandai `isGraded` sesuai alur atau `isGraded = false` jika ada soal esai yang perlu dikoreksi manual). Kita akan set `isCorrect` awal sebagai `false` untuk `SHORT_ANSWER` dan `MATCHING`, namun menyimpan teks jawaban lengkap.
     - Hitung skor akhir menggunakan rumus: `(correctCount / totalSoalDiHitung) * 100`. Jika tidak ada soal yang dihitung otomatis, skor default adalah 0.
   - **Transaksi Atomik Prisma (`prisma.$transaction`)**:
     - Gunakan `$transaction` untuk memastikan penyimpanan _all-or-nothing_:
       1. Buat record baru di `ExamAttempt`: `examId`, `studentName`, `studentId`, `startedAt` (dihitung dari payload/selisih waktu, atau gunakan waktu saat ini dikurangi durasi, atau kita ambil dari `startedAt` siswa atau null, mari simpan waktu mulai dari database/selisih pengerjaan), `submittedAt: new Date()`, `score`, `isGraded: true` (atau `false` jika terdapat soal `SHORT_ANSWER` / `MATCHING` agar Guru tahu ada yang perlu dikoreksi).
       2. Buat record massal di `StudentAnswer` menggunakan `createMany` terhubung dengan `attemptId` hasil langkah 1.
   - **Format Respon**: Jika berhasil, kembalikan status `200 OK` dengan JSON `{ success: true, message: "Lembar jawaban berhasil disimpan." }`. Jangan bocorkan nilai akhir siswa di respon ini.

## 4. Dependencies (Ketergantungan)

- `@prisma/client` (Sudah terpasapang)
- `Next.js App Router API Handler` (Bawaan)

## 5. Edge Cases & Error Handling (Penanganan Kasus Khusus & Galat)

- **Koneksi database terputus di tengah jalan**: Prisma transaction menjamin tidak ada data setengah tersimpan. Jika gagal, kembalikan `500 Internal Server Error`.
- **Siswa mengumpulkan dengan data kosong (`answers: []`)**: Diperbolehkan jika memang dikunci oleh batas waktu habis (auto-submit), skor otomatis bernilai `0`.
- **Perbedaan zona waktu**: Selalu bandingkan waktu menggunakan objek `Date` standar di server (UTC/Zona Waktu Server) yang konsisten.
- **Toleransi 60 detik (Grace Period)**: Menghindari penolakan jawaban siswa yang mengklik tombol kumpul tepat pada detik terakhir durasi berakhir namun mengalami latensi jaringan internet lambat.
