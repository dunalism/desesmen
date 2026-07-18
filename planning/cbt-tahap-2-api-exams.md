# 📝 Perencanaan CBT Tahap 2: API Pembuatan Ujian & Static JSON Generator (Guru)

Dokumen ini menjelaskan rencana implementasi teknis untuk Tahap 2 pengembangan fitur CBT (Computer Based Test).

## 1. Objective

Membuat REST API endpoint `POST /api/exams` yang digunakan oleh Guru untuk mengaktifkan sesi ujian baru (`Exam`). API ini akan menyimpan data sesi ujian di TiDB Serverless, mengoptimalkan pengambilan data soal (mencegah N+1 query), membuang kunci jawaban untuk keamanan, serta menuliskan berkas JSON statis ke folder publik server agar bisa diunduh secara instan oleh siswa tanpa membebani database.

---

## 2. Affected Files

Berikut adalah daftar berkas yang akan dibuat atau dimodifikasi:

- [ ] `prisma/schema.prisma` _(Modifikasi)_ - Menambahkan properti pengacakan `shuffleQuestions` dan `shuffleOptions` pada model `Exam`.
- [ ] `src/app/api/exams/route.ts` _(Berkas Baru)_ - API endpoint utama untuk penanganan pembuatan sesi ujian dan static JSON generation dengan opsi pengacakan.
- [ ] `planning/cbt-feature-roadmap.md` _(Status update)_ - Menandai Tahap 2 sebagai selesai setelah verifikasi berhasil.

---

## 3. Implementation Steps

### A. Database Schema Adjustment (Model `Exam`)

Modifikasi model `Exam` di `prisma/schema.prisma`:

```prisma
model Exam {
  // ... field yang sudah ada ...
  shuffleQuestions Boolean       @default(false) // Guru memilih apakah soal diacak per siswa
  shuffleOptions   Boolean       @default(false) // Guru memilih apakah opsi pilihan ganda diacak per siswa
}
```

Lakukan migrasi perubahan ke database dengan menjalankan perintah `npx prisma db push`.

### B. Setup Endpoint API (`POST /api/exams`)

Buat file `src/app/api/exams/route.ts`. Endpoint ini akan mendukung operasi:

- **`POST`**:
  1. Menerima data payload dari request body:
     - `userId`: ID Guru / Pengguna (Firebase UID)
     - `assessmentId`: ID Paket Soal yang dipilih
     - `title`: Judul Ujian (misal: "Ujian Akhir Semester Fisika")
     - `duration`: Durasi pengerjaan dalam satuan menit (angka bulat)
     - `startTime`: Tanggal & waktu mulai (ISO String)
     - `endTime`: Tanggal & waktu selesai (ISO String)
     - `showLeaderboard`: Toggle tampilan papan peringkat (boolean)
     - `shuffleQuestions`: Menentukan apakah soal diacak (boolean, default: false)
     - `shuffleOptions`: Menentukan apakah opsi diacak (boolean, default: false)
  2. Validasi input: Pastikan semua data lengkap dan tipe datanya valid.
  3. Validasi Kepemilikan: Memastikan `assessmentId` yang diminta memang milik `userId` tersebut. Jika tidak cocok, kirim respon `403 Forbidden` / `401 Unauthorized`.
  4. Pembuatan Token Ujian Unik:
     - Generate token alfanumerik 6 karakter (huruf besar & angka, contoh: `MAT7X2`).
     - Lakukan pengecekan tabrakan token (_collision check_) di database. Jika sudah ada token yang sama, lakukan generate ulang secara rekursif/looping sampai mendapatkan token yang benar-benar unik.
  5. Penyimpanan Data Sesi Ujian (`Exam`) di Database TiDB:
     - Gunakan `prisma.exam.create` untuk menyimpan rekamannya dengan properti `shuffleQuestions` dan `shuffleOptions`.
  6. Pengambilan Soal Secara Efisien (Pencegahan N+1 Query):
     - Jalankan kueri tunggal menggunakan Prisma `include` untuk mem-fetch seluruh soal (`Question`) beserta pilihan jawabannya (`Option`) dari `Assessment` terkait:
       ```typescript
       const assessment = await prisma.assessment.findUnique({
         where: { id: assessmentId },
         include: {
           questions: {
             orderBy: { order: "asc" },
             include: {
               options: true,
             },
           },
         },
       });
       ```
  7. Pembersihan Data Sensitif (Sanitisasi Kunci Jawaban):
     - Lakukan iterasi (_mapping_) pada array questions.
     - Buang properti `answerKey` pada level soal.
     - Buang properti `isCorrect` pada level pilihan jawaban (`options`).
     - Hal ini mencegah siswa melakukan _inspect element_ atau membaca berkas JSON statis untuk menyontek kunci jawaban.
  8. Penulisan Berkas JSON Statis:
     - Pastikan direktori `public/exams` tersedia secara aman dengan `fs.mkdirSync('public/exams', { recursive: true })`.
     - Gunakan `fs.writeFileSync` (atau `fs/promises`) untuk menuliskan berkas `public/exams/[token].json`.
  9. Kembalikan respon `201 Created` berisi detail sesi ujian yang sukses dibuat beserta tokennya.

---

## 4. Dependencies

Tidak diperlukan paket npm tambahan baru. Kita akan menggunakan library standar bawaan Node.js dan proyek:

- `fs` & `path` untuk manipulasi file statis.
- `@/lib/prisma` untuk interaksi database.

---

## 5. Edge Cases & Error Handling

- **Token Collision**: Diatasi dengan melakukan pengecekan token di database (`prisma.exam.findUnique`) sebelum menyimpannya. Kita akan membuat fungsi generator token yang aman.
- **Assessment Tidak Ditemukan / Bukan Milik User**: Sistem akan memvalidasi kepemilikan paket soal dan mengembalikan status `404 Not Found` atau `403 Forbidden` alih-alih melanjutkan proses dan menulis berkas kosong.
- **Direktori Publik Belum Ada**: Ditangani secara otomatis dengan parameter `{ recursive: true }` pada `fs.mkdirSync`.
- **Parsing Tanggal Tidak Valid**: Masukan `startTime` dan `endTime` akan divalidasi dengan `new Date()`. Jika tanggal tidak valid, kembalikan status `400 Bad Request`.
- **Masalah Berkas Terkunci (File I/O Error)**: Operasi penulisan file dibungkus dalam blok `try-catch` yang kokoh, jika gagal menulis ke sistem berkas, transaksi database dapat dibatalkan atau dibersihkan dan mengembalikan `500 Internal Server Error`.

---

## 6. Contoh Payload Request & Response

### Request (`POST /api/exams`)

```json
{
  "userId": "firebase-uid-guru-123",
  "assessmentId": "assessment-uuid-xyz",
  "title": "Kuis Harian Logika Informatika",
  "duration": 45,
  "startTime": "2026-06-25T08:00:00.000Z",
  "endTime": "2026-06-25T12:00:00.000Z",
  "showLeaderboard": true,
  "shuffleQuestions": true,
  "shuffleOptions": true
}
```

### Response (`201 Created`)

```json
{
  "success": true,
  "message": "Sesi ujian CBT berhasil diaktifkan.",
  "data": {
    "id": "exam-uuid-abc",
    "title": "Kuis Harian Logika Informatika",
    "token": "MAT7X2",
    "duration": 45,
    "startTime": "2026-06-25T08:00:00.000Z",
    "endTime": "2026-06-25T12:00:00.000Z",
    "isActive": true,
    "showLeaderboard": true,
    "shuffleQuestions": true,
    "shuffleOptions": true
  }
}
```

### Hasil Isi File Statis (`public/exams/MAT7X2.json`)

```json
{
  "examId": "exam-uuid-abc",
  "title": "Kuis Harian Logika Informatika",
  "duration": 45,
  "shuffleQuestions": true,
  "shuffleOptions": true,
  "questions": [
    {
      "id": "q-1",
      "type": "MULTIPLE_CHOICE",
      "questionText": "<p>Manakah yang merupakan proposisi?</p>",
      "options": [
        { "id": "o-1", "optionText": "Kucing itu lucu." },
        { "id": "o-2", "optionText": "Hari ini hujan deras." }
      ]
    }
  ]
}
```
