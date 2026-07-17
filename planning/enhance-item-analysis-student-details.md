# Rencana Peningkatan Analisis Butir Soal - Detail Jawaban Siswa

Peningkatan pada dialog detail analisis butir soal (`ItemAnalysisDialog.tsx`) untuk menampilkan daftar siswa yang menjawab benar dan salah. Pada daftar siswa yang menjawab salah, detail pilihan/teks jawaban yang mereka pilih/tulis juga akan ditampilkan.

## 1. Objective (Tujuan)

Menyediakan visualisasi data yang lebih mendalam pada guru untuk melihat siapa saja siswa yang berhasil menjawab dengan benar dan siapa saja yang salah beserta isi jawaban salah mereka pada suatu butir soal.

## 2. Affected Files (File yang Terpengaruh)

- `src/components/dashboard/results/ItemAnalysisDialog.tsx` (Komponen Dialog Detail Butir Soal)
- `src/app/dashboard/exams/[id]/results/page.tsx` (Halaman utama hasil ujian yang memanggil dialog ini dan mengirimkan prop `attempts`)

## 3. Implementation Steps (Langkah Implementasi)

### A. Modifikasi `ItemAnalysisDialog.tsx`

1. Ubah interface `ItemAnalysisDialogProps` untuk menerima prop `attempts: ExamAttemptItem[]` dari komponen induk.
2. Import `ExamAttemptItem` dari `./types` di dalam `ItemAnalysisDialog.tsx`.
3. Filter dan kelompokkan siswa berdasarkan jawaban mereka untuk pertanyaan terpilih:
   - Cari jawaban siswa untuk `selectedAnalysisItem.questionId` di setiap attempt.
   - Jika jawaban ditemukan dan `isCorrect === true`, masukkan siswa ke daftar **Menjawab Benar**.
   - Jika jawaban ditemukan dan `isCorrect === false` (atau tidak benar), masukkan siswa ke daftar **Menjawab Salah**.
4. Untuk siswa yang menjawab salah:
   - Dapatkan detail jawabannya.
   - Jika tipe soal adalah `MULTIPLE_CHOICE`:
     - Cari teks opsi jawaban berdasarkan `chosenOptionId` di dalam `selectedAnalysisItem.options`.
     - Tampilkan teks opsi tersebut.
   - Jika tipe soal lainnya (seperti `SHORT_ANSWER`):
     - Tampilkan nilai `textAnswer`.
5. Rancang UI yang bersih menggunakan komponen Accordion shadcn `@/src\components\ui\accordion.tsx` untuk memisahkan daftar "Jawaban Benar" dan "Jawaban Salah" agar dialog tetap rapi dan tidak terlalu panjang.
6. Tambahkan ikon-ikon pendukung seperti checkmark (hijau) untuk jawaban benar dan silang (merah) untuk jawaban salah.

### B. Modifikasi `src/app/dashboard/exams/[id]/results/page.tsx`

1. Kirimkan prop `attempts={attempts}` ke dalam komponen `<ItemAnalysisDialog>` yang dirender di baris 222-225.

## 4. Dependencies (Ketergantungan)

- Tidak ada package eksternal baru yang perlu diinstal. Kita akan menggunakan ikon dari `lucide-react` (seperti `XCircle`, `CheckCircle`, `User`, `ListFilter`) dan komponen UI Tailwind bawaan yang sudah ada.

## 5. Edge Cases & Error Handling (Kasus Khusus & Penanganan Error)

- **Siswa belum menjawab / Jawaban Kosong:** Jika siswa tidak mengisi jawaban atau `chosenOptionId` / `textAnswer` bernilai null, tampilkan keterangan "(Tidak menjawab)".
- **Tipe Soal selain MULTIPLE_CHOICE:** Untuk esai atau isian singkat, pencocokan teks jawaban langsung ditampilkan dari `textAnswer`.
- **Tidak ada data siswa:** Jika data `attempts` kosong, tampilkan placeholder yang rapi.
- **Scrollable dialog:** Menambahkan scroll pada daftar siswa agar dialog tidak melebihi tinggi layar (`max-h-[85vh]` dengan `overflow-y-auto` sudah diimplementasikan, tapi kita akan memastikan layout daftar siswa rapi).
