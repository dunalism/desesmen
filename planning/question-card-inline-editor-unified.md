# Rencana Implementasi Penyatuan Edit Mode dengan `InlineQuestionEditor` di `QuestionCard`

Dokumen perencanaan ini merinci langkah-langkah untuk menyatukan UI/UX pengeditan soal menggunakan komponen `InlineQuestionEditor` yang utuh, serta menghapus logika textarea/input HTML yang merusak visual pada `QuestionCard`.

## 1. Objective (Tujuan)

- Menyesuaikan `InlineQuestionEditor.tsx` agar dapat menerima properti opsional `initialQuestion?: Question` dan `index?: number` untuk mendukung **Mode Edit Soal Lama**.
- Memperbarui `QuestionCard.tsx` agar tidak lagi memiliki logika edit form internal (textarea, input, dsb.).
- Jika tombol edit di `QuestionCard` ditekan (`isEditing === true`), seluruh isi kartu `QuestionCard` akan digantikan secara elegan dengan komponen `<InlineQuestionEditor initialQuestion={question} index={index} onSave={(updated) => { onUpdate(updated); setIsEditing(false); }} onCancel={() => setIsEditing(false)} />`.
- Memastikan tidak ada sisa tag HTML mentah dalam bentuk input teks biasa selama proses edit.

## 2. Affected Files (Berkas yang Terpengaruh)

- [ ] `src/components/dashboard/InlineQuestionEditor.tsx` (Mendukung mode edit dan inisialisasi state dari properti `initialQuestion`)
- [ ] `src/components/dashboard/QuestionCard.tsx` (Mengganti seluruh tampilan edit form internal dengan `InlineQuestionEditor`)

## 3. Implementation Steps (Langkah-Langkah Implementasi)

### Langkah 1: Memperbarui `InlineQuestionEditor.tsx`

1. Perluas `InlineQuestionEditorProps` untuk mendukung:
   ```typescript
   interface InlineQuestionEditorProps {
     initialQuestion?: Question;
     index?: number;
     onSave: (question: Question) => void;
     onCancel: () => void;
   }
   ```
2. Modifikasi state inisialisasi agar membaca data dari `initialQuestion` jika tersedia:
   - `questionText`: default `initialQuestion?.questionText || ""`
   - `questionType`: default `initialQuestion?.type || "MULTIPLE_CHOICE"`
   - Pilihan ganda `options`:
     - Jika `initialQuestion?.type === "MULTIPLE_CHOICE"`, petakan array objek `Option` menjadi array string: `initialQuestion.options.map(o => o.optionText)`.
     - Tentukan indeks jawaban yang benar (`correctOptionIdx`): cari indeks opsi yang `isCorrect === true`.
   - Benar/Salah `trueFalseAnswer`: tentukan `"TRUE"` atau `"FALSE"` berdasarkan kecocokan kunci jawaban.
   - Menjodohkan `matchingAnswer` dan Esai `essayAnswer` diisi dari `initialQuestion?.answerKey || ""`.
3. Sesuaikan visual UI:
   - Jika dalam mode edit (ada `initialQuestion`), judul kartu menjadi: `Edit Soal #${(index ?? 0) + 1}` dengan ikon `Edit` dari Lucide.
   - Tombol simpan bertuliskan: "Simpan Perubahan".
   - ID yang digunakan saat submit tetap menggunakan ID asli: `initialQuestion.id` daripada membuat UUID/tempId baru.

### Langkah 2: Menyederhanakan `QuestionCard.tsx`

1. Hapus seluruh state `questionText`, `options`, `answerKey`, `hasChanges`, fungsi resetting, serta fungsi handler perubahan opsi internal.
2. Di dalam fungsi render:
   - Jika `isEditing === true`, langsung render komponen `<InlineQuestionEditor>` dengan melewatkan `initialQuestion={question}`, `index={index}`, `onSave`, dan `onCancel` sebagai pengganti tampilan card default.
   - Jika `isEditing === false`, tampilkan layout read-only yang sudah ada saat ini (lengkap dengan checkbox, indeks nomor, render rich text, daftar pilihan jawaban read-only, tombol hapus, dan tombol edit).

## 4. Dependencies (Dependensi)

Tidak ada dependensi eksternal baru.

## 5. Edge Cases & Error Handling (Penanganan Kasus Khusus)

- **Pembatalan Edit**: Jika guru menekan tombol "Batal" di dalam mode edit, status `isEditing` di `QuestionCard` diubah kembali ke `false` tanpa merubah data apa pun.
- **Konsistensi ID**: Memastikan ID opsi jawaban (`options[i].id`) tetap sinkron jika mengedit jenis tipe Pilihan Ganda agar tidak merusak database di Prisma.
