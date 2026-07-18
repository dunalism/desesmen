# Rencana Implementasi Pembuatan Paket Soal Manual dengan Inline Editor (TipTap)

Dokumen perencanaan ini merinci strategi, alur kerja (UX), serta pemetaan kode untuk menghadirkan fitur **"Membuat Paket Soal Baru secara Manual"** dari awal tanpa AI, mengatasi render HTML plain teks pada peninjauan soal, dan merancang **Inline Editor Card** yang 100% bebas dari crash focus-trap/z-index.

## 1. Objective (Tujuan)

- **Metode Pembuatan Manual:** Guru dapat membuat paket soal baru kosong langsung dari halaman `/dashboard/generate` dengan mendefinisikan judul, kesulitan, dan tipe soal utama.
- **Rendering HTML Sempurna:** Menghapus tampilan tag HTML murni (plain text) pada halaman review soal dengan memanfaatkan perenderaan `dangerouslySetInnerHTML` yang dibungkus styling Tailwind Typography (`prose prose-sm dark:prose-invert`).
- **Inline Question Editor (Anti-Crash):** Mengganti modal popup yang rawan tabrakan focus-trap dengan kartu editor melayang yang terintegrasi langsung di dalam alur halaman (inline/in-place).
- **Maksimal 500 Baris:** Memisahkan komponen editor baru secara modular agar ukuran file tetap terjaga di bawah batas 500 baris.

## 2. Affected Files (Berkas yang Terpengaruh)

- [ ] `src/app/api/assessments/route.ts` (Update API POST untuk mendukung pembuatan paket manual kosong)
- [ ] `src/app/dashboard/generate/page.tsx` (Integrasi opsi "Buat Manual" pada alur input/config)
- [ ] `src/components/dashboard/ReviewStep.tsx` (Integrasi penambahan soal baru via Inline Editor dan render list kosong)
- [ ] `src/components/dashboard/QuestionCard.tsx` (Mengaktifkan rendering rich text HTML)
- [ ] `src/components/dashboard/InlineQuestionEditor.tsx` (Komponen baru: kartu form edit/tambah soal multi-tipe)

## 3. Implementation Steps (Langkah-Langkah Implementasi)

### Langkah 1: Memperbarui API POST (`src/app/api/assessments/route.ts`)

- Tambahkan properti opsional `isManual: boolean` ke dalam request body POST.
- Jika `isManual === true`:
  - Lewati validasi panjang `rawInputText` dan bypass panggilan ke Gemini AI.
  - Buat rekaman `Assessment` kosong di database dengan total soal `questionCount: 0` dan relasi `questions` kosong (`create: []`).
  - Kembalikan ID asesmen baru tersebut agar client bisa langsung mengalihkan halaman ke `/dashboard/assessment/[id]`.

### Langkah 2: Integrasi Opsi di Halaman Generate (`src/app/dashboard/generate/page.tsx`)

- Di halaman input materi (`InputStep.tsx` atau langsung di `page.tsx` generate), sediakan pilihan opsi metode pembuatan:
  - **Otomatis (AI):** Alur yang sudah ada (mengharuskan input materi teks/gambar).
  - **Manual dari Awal:** Lewati input materi langsung ke langkah pengisian konfigurasi (Judul, Kesulitan, Tipe Soal).
- Saat menekan "Mulai Buat Soal" pada mode manual, panggil API POST dengan menyertakan `{ isManual: true }`, lalu alihkan Guru langsung ke halaman detail `/dashboard/assessment/[id]`.

### Langkah 3: Mengaktifkan Rendering Rich Text HTML di `src/components/dashboard/QuestionCard.tsx`

- Ubah baris render `{question.questionText}` yang semula plain text menjadi rendering HTML yang aman:
  ```typescript
  <div
    className="font-medium text-foreground text-base leading-relaxed prose prose-sm dark:prose-invert max-w-none"
    dangerouslySetInnerHTML={{ __html: question.questionText }}
  />
  ```
- Lakukan hal serupa pada render pilihan jawaban jika diperlukan di masa depan.

### Langkah 4: Membuat Komponen `InlineQuestionEditor.tsx`

Membuat file baru `src/components/dashboard/InlineQuestionEditor.tsx` yang merupakan form input terintegrasi di dalam list (in-place) tanpa modal portal:

- Memakai komponen `RichTextEditor` (TipTap) untuk mengedit teks pertanyaan.
- Menyediakan dropdown pilihan tipe soal: Pilihan Ganda (`MULTIPLE_CHOICE`), Benar / Salah (`TRUE_FALSE`), Menjodohkan (`MATCHING`), dan Esai (`SHORT_ANSWER`).
- Menyajikan input dinamis yang responsif sesuai tipe soal yang dipilih:
  - Pilihan Ganda: 4/5 pilihan jawaban dengan radio button untuk memilih satu kunci jawaban yang benar.
  - Benar/Salah: Toggle pilihan Benar atau Salah.
  - Menjodohkan: Kolom input "Premis (Kiri)" dan "Jawaban Pasangan (Kanan)".
  - Esai: Textarea untuk memasukkan contoh kunci jawaban.
- Memiliki validasi input ketat (mencegah teks kosong, pilihan kosong, dll.) dan memicu callback `onSave(newQuestion)` setelah berhasil.

### Langkah 5: Integrasi di `src/components/dashboard/ReviewStep.tsx`

- Tambahkan state `isAdding` (boolean) untuk mengontrol visibilitas editor.
- Di bagian atas list, jika list soal kosong (`questions.length === 0`), tampilkan banner kosong (Empty State) yang indah bertuliskan: _"Paket soal ini masih kosong. Silakan buat soal pertama Anda!"_ beserta tombol besar **"+ Tambah Soal Pertama"**.
- Di bagian bawah list soal, render komponen `<InlineQuestionEditor />` jika `isAdding === true`.
- Setelah Guru mengisi form editor dan menekan "Simpan", soal tersebut ditambahkan ke array lokal `questions` dan memicu tombol **"Simpan Perubahan ke Database"** untuk melakukan persistensi data melalui API `PUT`.

## 4. Dependencies (Dependensi)

Tidak ada dependensi baru. SWR, TipTap, dan Starter-Kit sudah terinstal sempurna.

## 5. Edge Cases & Error Handling (Penanganan Kasus Khusus)

- **Tampilan Editor Crash di Server:** Karena TipTap mengakses objek browser `window`, komponen `InlineQuestionEditor` akan dimuat secara dinamis dengan `{ ssr: false }` untuk mencegah tabrakan build pada Next.js SSR.
- **Konflik ID Sementara:** Untuk soal manual baru yang belum masuk database, kita akan memberikan ID sementara berbasis timestamp (`manual-[timestamp]`). Ketika data disimpan ke MySQL via API PUT, Prisma secara otomatis akan memberikan ID UUID permanen.

---

## Pernyataan Persetujuan

Apakah rencana arsitektur dan fungsionalitas ini sudah sesuai dengan ekspektasi Anda? Silakan balas dengan **"lanjut"**, **"ok"**, atau **"eksekusi"** untuk memulai pengerjaan!
