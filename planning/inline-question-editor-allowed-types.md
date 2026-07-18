# Rencana Implementasi Sinkronisasi Tipe Soal dengan Paket Assessment di `InlineQuestionEditor`

Dokumen perencanaan ini merinci penyesuaian tipe soal pada `InlineQuestionEditor.tsx` agar tipe soal yang dapat dibuat/diedit disinkronkan secara otomatis dengan tipe paket soal utama pada assessment.

## 1. Objective (Tujuan)

- Menambahkan properti `allowedType?: string` pada `InlineQuestionEditorProps`.
- Jika paket soal bertipe tunggal (misal `MULTIPLE_CHOICE`), `InlineQuestionEditor` otomatis mengunci tipe soal ke tipe tersebut dan mendisaktifkan (disable) pilihan dropdown tipe soal.
- Jika paket soal bertipe `MIXED` (Campuran), dropdown tipe soal tetap aktif agar guru bebas memilih tipe soal mana pun yang ingin dibuat.
- Mengunci dropdown tipe soal saat dalam mode edit (`isEditMode === true`) karena merubah tipe soal pada soal yang sudah ada akan merusak struktur data jawaban.

## 2. Affected Files (Berkas yang Terpengaruh)

- [ ] `src/components/dashboard/InlineQuestionEditor.tsx` (Menerima properti `allowedType`, mengunci tipe soal, dan menonaktifkan select dropdown jika diperlukan)
- [ ] `src/components/dashboard/ReviewStep.tsx` (Mengirimkan properti `allowedType={questionType}` ke `InlineQuestionEditor`)
- [ ] `src/components/dashboard/QuestionCard.tsx` (Mengirimkan properti `allowedType={question.type}` saat mengedit lewat kartu)

## 3. Implementation Steps (Langkah-Langkah Implementasi)

1. **Memperbarui `InlineQuestionEditor.tsx`**:
   - Tambahkan `allowedType?: string` ke interface `InlineQuestionEditorProps`.
   - Di dalam inisialisasi state `questionType`, gunakan logika berikut:
     ```typescript
     const [questionType, setNewQuestionType] = useState<
       "MULTIPLE_CHOICE" | "TRUE_FALSE" | "SHORT_ANSWER" | "MATCHING"
     >(() => {
       if (initialQuestion?.type) return initialQuestion.type;
       if (
         allowedType &&
         allowedType !== "MIXED" &&
         allowedType !== "Campuran"
       ) {
         return allowedType as
           | "MULTIPLE_CHOICE"
           | "TRUE_FALSE"
           | "SHORT_ANSWER"
           | "MATCHING";
       }
       return "MULTIPLE_CHOICE";
     });
     ```
   - Di dalam dropdown `<select>`, tambahkan atribut `disabled={isEditMode || (!!allowedType && allowedType !== "MIXED" && allowedType !== "Campuran")}`.

2. **Memperbarui `ReviewStep.tsx`**:
   - Saat merender `<InlineQuestionEditor />` untuk penulisan soal baru di bagian bawah list, teruskan properti `allowedType={questionType}`.

3. **Memperbarui `QuestionCard.tsx`**:
   - Saat merender `<InlineQuestionEditor />` untuk pengeditan soal lama, teruskan properti `allowedType={question.type}`.

## 4. Dependencies (Dependensi)

Tidak ada dependensi eksternal baru.

## 5. Edge Cases & Error Handling (Penanganan Kasus Khusus)

- **Input Tipe Soal Campuran / MIXED**: Dropdown select tetap berjalan normal tanpa mengunci apa pun, membiarkan guru memilih satu dari empat tipe soal secara bebas.
