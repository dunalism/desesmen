# 📋 RENCANA IMPLEMENTASI: TAHAP 7 - DASHBOARD PENILAIAN & STATISTIK SISWA (GURU)

Dokumen ini berisi rencana pengembangan untuk menyelesaikan **Tahap 7** pada Peta Jalan Pengembangan Fitur CBT. Kita akan membangun antarmuka analisis nilai, koreksi esai secara asinkron, statistik butir soal, dan fitur ekspor laporan nilai sekolah.

---

## 1. OBJECTIVE (Tujuan)

Membangun dashboard analisis nilai CBT dan sistem penilaian esai yang efisien, responsif, dan hemat Request Units (RU) database untuk mendukung infrastruktur serverless (TiDB Serverless).

---

## 2. AFFECTED FILES (Berkas yang Terpengaruh)

- `planning/cbt-tahap-7-dashboard-penilaian.md` (Berkas rencana baru - _Selesai_)
- `src/app/api/exams/[id]/results/route.ts` (Endpoint baru untuk menarik hasil ujian)
- `src/app/api/exams/[id]/score-essay/route.ts` (Endpoint baru untuk koreksi/penilaian esai siswa)
- `src/app/dashboard/exams/[id]/results/page.tsx` (Antarmuka hasil ujian guru dengan rekap data, tabel hasil, analisis butir soal, dialog periksa esai, dan ekspor CSV)

---

## 3. IMPLEMENTATION STEPS (Langkah-langkah Implementasi)

### A. API Pengembangan

#### 1. API GET `/api/exams/[id]/results`

- **Tugas**: Menarik ringkasan detail ujian, data peserta (`ExamAttempt` & `StudentAnswer`), dan statistik butir soal.
- **Logika**:
  - Validasi keberadaan `Exam` berdasarkan ID yang dikirim.
  - Ambil semua `ExamAttempt` yang memiliki `examId === id` beserta relasi `answers` (termasuk `question`).
  - Tarik seluruh soal (`Question`) yang terikat pada `Assessment` terkait ujian ini.
  - Hitung statistik ringkasan kelas:
    - Rata-rata Nilai (hanya yang sudah selesai dinilai atau semua yang disubmit).
    - Nilai Tertinggi.
    - Nilai Terendah.
    - Jumlah Siswa Sudah Submit.
  - Lakukan analisis statistik per nomor soal (Item Analysis):
    - Hitung berapa persentase siswa yang salah atau benar pada setiap butir soal.
    - Persentase kesalahan = `(Jumlah salah / Jumlah seluruh usaha pengerjaan) * 100`.
  - Mengembalikan struktur data JSON yang bersih dan siap saji untuk meminimalkan beban komputasi di sisi client.

#### 2. API PATCH `/api/exams/[id]/score-essay`

- **Tugas**: Memperbarui status `isCorrect` (benar/salah) dan `textAnswer` (jika perlu) untuk esai, serta memperbarui nilai/skor akhir `ExamAttempt` secara dinamis.
- **Payload**: `{ attemptId, questionId, scoreEssay }` di mana `scoreEssay` bernilai 0 s.d. 100 atau boolean/angka penilaian.
- **Logika**:
  - Lakukan pencarian data `StudentAnswer` yang cocok dengan `attemptId` dan `questionId`.
  - Update `isCorrect` pada `StudentAnswer` tersebut (misal jika `scoreEssay > 0` diset `true`, jika `0` diset `false`). Simpan juga nilai esai tersebut (kita bisa memanfaatkan `isCorrect` atau melakukan penyesuaian). Tunggu, bagaimana struktur DB `StudentAnswer`? Di schema, `StudentAnswer` memiliki field:
    - `id` (String)
    - `attemptId` (String)
    - `questionId` (String)
    - `chosenOptionId` (String?)
    - `textAnswer` (String?)
    - `isCorrect` (Boolean?)
  - Karena kita tidak memiliki kolom `score` spesifik di `StudentAnswer`, kita dapat menandai `isCorrect = true/false` atau kita bisa menggunakannya sebagai bobot atau flag benar/salah murni. Dalam instruksi:
    _"Di dalam Dialog tersebut, sediakan Input angka untuk memasukkan nilai esai, serta tombol “Simpan & Kalkulasi Ulang Skor” yang menembak API PATCH."_
    Dan di bagian API Route:
    _"Endpoint tunggal untuk menerima payload `{ attemptId, questionId, scoreEssay }` guna memperbarui nilai esai siswa di database sekaligus memicu kalkulasi ulang kolom `score` pada tabel `ExamAttempt`."_
    Wait! Untuk esai (`SHORT_ANSWER`), mari kita hitung ulang skor total `ExamAttempt`. Rumus skor total adalah `(Jumlah Soal Benar / Total Soal) * 100`.
    Maka ketika Guru memberikan nilai esai (misal benar/salah), kita perbarui `isCorrect` menjadi `true` atau `false` (atau sesuai input: jika `scoreEssay >= 50` maka `isCorrect = true`, jika tidak `false`, atau kita simpan status kebenarannya secara langsung). Agar kompatibel dengan schema yang ada, kita perbarui `isCorrect = (scoreEssay >= 50)` atau jika esai bernilai penuh maka `isCorrect = true`. Mari kita buat fleksibel: `isCorrect` di-set sesuai apakah esai tersebut dinilai benar (e.g. `scoreEssay` dikonversi menjadi boolean ke `isCorrect` atau kita anggap proporsi benar).
    Wait, mari kita implementasikan: `isCorrect` bernilai `true` jika `scoreEssay` bernilai positif/benar (atau kita simpan proporsi nilai esai tersebut jika ingin mendukung skor parsial, tetapi karena `isCorrect` adalah boolean, kita bisa mengeset `isCorrect = (scoreEssay >= 50)` atau `isCorrect = true` jika diset benar). Mari kita buat input berupa radio/toggle "Benar / Salah" atau input angka di mana jika >= 50 diset `isCorrect: true`, jika tidak `false`, atau gunakan input angka 0-100 dan ubah `isCorrect` berdasarkan itu.
    Setelah di-update, hitung ulang total nilai untuk `ExamAttempt` tersebut:
    `score = (Jumlah StudentAnswer dengan isCorrect === true / Total StudentAnswer) * 100`.
    Lalu lakukan update `score` dan `isGraded: true` pada `ExamAttempt`. Semua ini dijalankan dalam satu transaksi.

---

### B. UI / UX Pengembangan (Dashboard Guru)

#### 1. Halaman `/dashboard/exams/[id]/results` (`page.tsx`)

- Menggunakan `"use client"` dan SWR untuk fetch data dari `/api/exams/[id]/results`.
- Menampilkan breadcrumbs dan informasi sesi ujian (Judul, Token, Durasi, Jumlah Soal).
- **Statistik Utama (4 Grid Cards)**:
  - Rata-rata Nilai Kelas (diambil dari semua `ExamAttempt` yang memiliki `score !== null`).
  - Nilai Tertinggi.
  - Nilai Terendah.
  - Jumlah Siswa Sudah Submit (`attempts.length`).
- **Tabel Hasil Ujian Siswa**:
  - Render menggunakan Shadcn `Table`.
  - Kolom: No Absen/NISN, Nama Siswa, Waktu Mulai, Waktu Selesai, Durasi Pengerjaan, Skor Akhir (Badge dengan warna dinamis hijau/kuning/merah), dan Aksi.
  - Aksi: Tombol _"Periksa Esai"_ jika ujian memiliki soal `SHORT_ANSWER`.
- **Dialog Periksa Esai**:
  - Menggunakan Shadcn `Dialog` untuk menampilkan seluruh pertanyaan esai siswa beserta jawaban teks mereka.
  - Guru dapat memilih/menginput apakah jawaban tersebut Benar atau Salah (atau memberi nilai esai), lalu menekan tombol _"Simpan & Kalkulasi Ulang Skor"_.
- **Analisis Butir Soal (Item Analysis)**:
  - Section Grid di bawah tabel utama.
  - Memetakan performa per nomor soal.
  - Menampilkan teks nomor soal (dibersihkan dari HTML tag) dan persentase kesalahan siswa.
  - Jika tingkat kesalahan > 70%, berikan border `border-destructive`, teks merah `text-destructive`, dan ikon `AlertTriangle`.
- **Ekspor Laporan (Client-Side CSV Export)**:
  - Tombol _"Ekspor CSV"_ murni client-side.
  - Memproses data hasil SWR ke format CSV dan men-download-nya dengan nama file `hasil-ujian-[token]-[tanggal].csv`.

---

## 4. DEPENDENCIES (Dependensi)

Tidak ada pustaka pihak ketiga baru yang perlu diinstal karena kita akan menggunakan:

- `lucide-react` untuk ikon.
- Tailwind CSS bawaan untuk styling.
- `useSWR` untuk data fetching.
- Shadcn UI components yang sudah ada (`src/components/ui/`).

---

## 5. EDGE CASES & ERROR HANDLING (Kasus Batas & Penanganan Error)

1. **Tidak Ada Peserta**: Jika belum ada siswa yang mengerjakan ujian, tampilkan pesan informatif _"Belum ada siswa yang mengirimkan lembar jawaban"_ dan set nilai statistik utama menjadi `0` atau `-`.
2. **Soal Campuran (Mixed)**: Jika ujian hanya berisi Pilihan Ganda (`MULTIPLE_CHOICE`), sembunyikan tombol _"Periksa Esai"_ karena semua penilaian sudah otomatis dilakukan oleh server-side grading engine di Tahap 5.
3. **Penyaringan HTML Tag**: Karena teks soal disimpan dalam format HTML (dari Rich Text Editor), bersihkan tag HTML tersebut menggunakan regex sederhana sebelum ditampilkan pada bagian Analisis Butir Soal untuk menjaga kerapian antarmuka.
4. **Loading & Error State**: Sediakan loading spinner (`Loader2`) yang cantik dan pesan error interaktif jika API gagal merespons.
