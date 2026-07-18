# Rencana Implementasi Skema Prisma untuk Fitur CBT (Computer Based Test)

Dokumen perencanaan ini merinci penambahan model baru di dalam `prisma/schema.prisma` untuk mendukung alur ujian online (CBT) yang offline-first, aman, dan hemat database koneksi.

## 1. Objective (Tujuan)

- Menambahkan skema model database untuk manajemen CBT yang mencakup:
  1. **Sesi Ujian (`Exam`)** yang dibuat oleh Guru berdasarkan Paket Soal (`Assessment`).
  2. **Usaha Ujian Siswa (`ExamAttempt`)** yang mencatat sesi pengerjaan siswa, waktu mulai, waktu selesai, dan nilai akhir siswa.
  3. **Jawaban Detail Siswa (`StudentAnswer`)** untuk mencatat jawaban siswa pada masing-masing butir soal ujian untuk kebutuhan analisis guru.
- Menjaga relasi antar model tetap aman dan terindeks dengan baik untuk MySQL.

## 2. Affected Files (Berkas yang Terpengaruh)

- [ ] `prisma/schema.prisma` (Menambahkan model `Exam`, `ExamAttempt`, dan `StudentAnswer`)

## 3. Implementation Steps (Langkah-Langkah Implementasi)

### Langkah 1: Memperbarui file `prisma/schema.prisma`

Kita akan menambahkan model berikut di bagian akhir file `prisma/schema.prisma`:

```prisma
// 5. Model Sesi Ujian (Exam) - Dibuat oleh Guru
model Exam {
  id           String        @id @default(uuid())
  assessmentId String
  assessment   Assessment    @relation(fields: [assessmentId], references: [id], onDelete: Cascade)

  title        String        @db.VarChar(255) // Nama/Judul sesi ujian (misal: "Ujian Harian Matematika")
  token        String        @unique @db.VarChar(50) // Kode ujian unik untuk diakses siswa
  duration     Int           // Durasi pengerjaan dalam menit
  startTime    DateTime      // Waktu mulai pengerjaan boleh diakses
  endTime      DateTime      // Waktu selesai pengerjaan ditutup
  isActive     Boolean       @default(true)

  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt
  attempts     ExamAttempt[]

  @@map("exams")
}

// 6. Model Usaha Ujian Siswa (ExamAttempt) - Lembar Jawaban Siswa
model ExamAttempt {
  id          String          @id @default(uuid())
  examId      String
  exam        Exam            @relation(fields: [examId], references: [id], onDelete: Cascade)

  studentName String          @db.VarChar(255) // Nama lengkap siswa
  studentId   String?         @db.VarChar(100) // Nomor absen atau NISN siswa (opsional)

  startedAt   DateTime        @default(now()) // Kapan siswa mulai membuka soal
  submittedAt DateTime?       // Kapan lembar jawaban sukses dikirim ke server

  score       Float?          // Hasil penilaian (skor 0 - 100)
  isGraded    Boolean         @default(false) // Apakah pengerjaan sudah dinilai secara sistem

  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt
  answers     StudentAnswer[]

  @@map("exam_attempts")
}

// 7. Model Detail Jawaban Siswa (StudentAnswer) - Jawaban per Butir Soal
model StudentAnswer {
  id             String      @id @default(uuid())
  attemptId      String
  attempt        ExamAttempt @relation(fields: [attemptId], references: [id], onDelete: Cascade)

  questionId     String
  question       Question    @relation(fields: [questionId], references: [id], onDelete: Cascade)

  // Jawaban yang dipilih/ditulis siswa
  chosenOptionId String?     @db.VarChar(255) // Menyimpan ID Option yang dipilih siswa (untuk MULTIPLE_CHOICE)
  textAnswer     String?     @db.Text         // Menyimpan teks jawaban untuk TRUE_FALSE, SHORT_ANSWER, MATCHING

  isCorrect      Boolean?    // Hasil penilaian benar/salah untuk butir soal ini (diisi oleh server)
  createdAt      DateTime    @default(now())

  @@map("student_answers")
}
```

### Langkah 2: Menambahkan relasi timbal balik di model yang sudah ada

Di dalam `prisma/schema.prisma` yang sudah ada:

1. Tambahkan `exams Exam[]` ke model `Assessment` karena satu `Assessment` dapat dipakai untuk beberapa kali sesi `Exam`.
2. Tambahkan `studentAnswers StudentAnswer[]` ke model `Question` karena satu `Question` dapat dijawab oleh banyak siswa.

## 4. Dependencies (Dependensi)

Tidak ada dependensi baru.

## 5. Edge Cases & Error Handling (Penanganan Kasus Khusus)

- **Token Duplikat**: Menggunakan `@unique` pada kolom `token` di model `Exam` untuk mencegah terjadinya token ujian yang kembar.
- **Relasi Cascade**: Menggunakan `onDelete: Cascade` pada seluruh relasi agar ketika sesi ujian atau paket soal dihapus, seluruh data usaha pengerjaan dan detail jawaban siswa ikut terhapus secara otomatis dan tidak meninggalkan data yatim-piatu (orphan data) di database.
