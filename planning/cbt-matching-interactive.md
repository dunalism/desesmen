# 📋 Rencana Implementasi: Interaktivitas Soal Menjodohkan (MATCHING) pada CBT

Dokumen ini menjelaskan strategi teknis sebagai TechLead untuk mendesain dan mengimplementasikan antarmuka interaktif baru untuk tipe soal Menjodohkan (MATCHING) pada CBT. Solusi ini aman dari kecurangan (cheat-proof), ramah performa, dan sinkron dengan gaya UI Shadcn.

---

## 🎯 OBJECTIVE

Mengubah antarmuka pengerjaan soal Menjodohkan (MATCHING) yang sebelumnya berupa kolom isian teks bebas (seperti esai) menjadi sistem pilihan interaktif. Siswa akan disajikan istilah/premis di kolom kiri dan dapat mencocokkannya dengan daftar definisi/pasangan acak yang diambil dari seluruh soal menjodohkan yang ada dalam ujian tersebut.

---

## 🧠 STRATEGI TECHLEAD (ARSITEKTUR & ALUR DATA)

### 1. Masalah Utama: Ketiadaan Opsi Pasangan di Sisi Client

Saat ini, berkas static JSON untuk CBT disanitasi sehingga `answerKey` (kunci jawaban) tidak dikirim ke client. Akibatnya, soal menjodohkan tidak memiliki pilihan definisi apa pun di sisi client (hanya berupa premis kosong).

### 2. Solusi Elegan: Dinamic Definition Pooling (Tanpa Mengubah Schema)

- **API Sanitization Level (`src/app/api/exams/[id]/questions/route.ts`)**:
  - Kita mengumpulkan semua `answerKey` dari seluruh soal bertipe `MATCHING` dalam assessment tersebut.
  - Kumpulan kunci jawaban ini disebut sebagai **Pool Definisi/Pasangan**.
  - Kita mengacak (shuffle) Pool Definisi ini agar urutannya acak.
  - Untuk setiap soal bertipe `MATCHING`, kita masukkan Pool Definisi acak ini ke dalam array `options` dengan ID sementara (misal: menggunakan index/teks itu sendiri).
  - Dengan cara ini, siswa menerima daftar pilihan pasangan tanpa mengetahui pasangan yang benar untuk premis yang mana.

- **Client Level (`src/app/cbt/[token]/page.tsx`)**:
  - Kita membuat sub-komponen khusus `"use client"` baru bernama `MatchingSelector.tsx` di `src/components/cbt/`.
  - Jika tipe soal adalah `MATCHING`, kita merender `MatchingSelector`.
  - Antarmuka berupa pilihan interaktif menggunakan Shadcn style (gabungan list kartu modern & Select dropdown/click-to-select) yang membuat pencocokan sangat intuitif baik di Desktop maupun Mobile.
  - Ketika pasangan dipilih, state jawaban disimpan dalam format `answerText` (berisi teks definisi yang dipilih).

- **Grading Level (`POST /api/exams/submit`)**:
  - Server-side grading akan tetap membandingkan `studentAnswer.textAnswer` (case-insensitive) dengan `question.answerKey` yang tersimpan di database. Ini membuat integrasi 100% kompatibel dengan skema DB yang sudah ada.

---

## 📂 AFFECTED FILES

Berikut adalah berkas-berkas yang akan dibuat atau dimodifikasi:

- [ ] `src/app/api/exams/[id]/questions/route.ts` (Modifikasi untuk menyuntikkan pool matching options)
- [ ] `src/components/cbt/MatchingSelector.tsx` (Pembuatan komponen interaktif baru)
- [ ] `src/app/cbt/[token]/page.tsx` (Integrasi komponen MatchingSelector)

---

## 🛠️ IMPLEMENTATION STEPS

### 1. Optimasi API Endpoint (`src/app/api/exams/[id]/questions/route.ts`)

- Cari seluruh soal bertipe `MATCHING` dalam assessment.
- Ekstrak seluruh `answerKey` yang unik dari soal-soal tersebut, lakukan trimming, lalu acak urutannya.
- Pada proses pemetaan soal, jika `question.type === "MATCHING"`, isi field `options` dengan daftar `answerKey` yang telah diacak tersebut, dalam format:
  ```json
  options: poolMatchingAnswers.map((key, index) => ({
    id: `opt-match-${index}`,
    optionText: key
  }))
  ```

### 2. Pembuatan Komponen `MatchingSelector.tsx`

- Komponen ini akan menerima:
  - `question`: Objek pertanyaan yang sedang aktif (termasuk `options` yang berisi pilihan pasangan).
  - `value`: Jawaban yang sudah dipilih siswa saat ini (`answerText` dari state).
  - `onChange`: Callback untuk memperbarui jawaban ketika siswa memilih pasangan baru.
- Desain UI (Gaya Shadcn):
  - **Tampilan Grid Istilah & Definisi**:
    - Kolom Kiri: Istilah/Premis yang ditanyakan (dengan visualisasi badge yang keren).
    - Kolom Kanan: Daftar definisi dalam bentuk kartu-kartu pilihan (click-to-select) atau sebuah dropdown `Select` yang elegan jika daftar definisi cukup panjang.
    - Menambahkan tombol "Hapus Pilihan" jika siswa ingin mereset pencocokan.

### 3. Integrasi pada Halaman Utama CBT (`src/app/cbt/[token]/page.tsx`)

- Ganti input teks manual pada section `currentQuestion.type === "MATCHING"` dengan merender komponen `<MatchingSelector />` yang baru.

---

## ⚠️ EDGE CASES & ERROR HANDLING

1. **Jumlah Soal Matching Sedikit (misal hanya 1)**: Jika hanya ada 1 soal menjodohkan, pool pilihan hanya berisi 1 jawaban. UI akan mendeteksinya dengan aman dan menampilkan single choice yang tetap bisa dipilih/dikonfirmasi siswa.
2. **Karakter Khusus**: Seluruh perbandingan dan penyimpanan string akan menggunakan `.trim()` untuk mencegah error spasi tambahan.

---

## 🏆 KRITERIA KEBERHASILAN (SUCCESS CRITERIA)

- Siswa tidak lagi mengetik manual jawaban menjodohkan.
- Siswa dapat melihat daftar definisi pasangan yang diacak dari seluruh soal menjodohkan yang ada dalam ujian.
- Antarmuka berjalan mulus di Mobile dan Desktop menggunakan tema gelap/terang.
- Hasil pengerjaan tersimpan di localStorage secara instan.
- Lolos verifikasi build `pnpm run build` tanpa error tipe data atau ESLint.
