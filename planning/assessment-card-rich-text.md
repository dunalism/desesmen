# Rencana Implementasi Perbaikan Rendering HTML Soal di `AssessmentCard.tsx`

Dokumen perencanaan ini merinci perbaikan rendering teks soal yang mengandung tag HTML Rich Text di dalam komponen `AssessmentCard.tsx` pada halaman Bank Soal.

## 1. Objective (Tujuan)

- Menghapus tampilan tag HTML mentah (seperti `<p>`, `<strong>`, dsb.) pada pratinjau pencarian ("Hybrid Search View") dan daftar checklist butir soal ("Pilih Butir Soal") di `AssessmentCard.tsx`.
- Memanfaatkan helper `stripHtml` untuk membersihkan tag HTML pada kotak pencarian agar ringkas dan bersih.
- Menggunakan `dangerouslySetInnerHTML` pada list check-box "Pilih Butir Soal" agar rendering Rich Text (bold, italic, underline, list, image) muncul dengan gaya yang indah dan serasi.

## 2. Affected Files (Berkas yang Terpengaruh)

- [ ] `src/components/dashboard/AssessmentCard.tsx` (Perbaikan rendering teks soal)

## 3. Implementation Steps (Langkah-Langkah Implementasi)

1. **Membuat Helper `stripHtml`**:
   - Definisikan fungsi lokal `stripHtml` di dalam `AssessmentCard.tsx` untuk menghapus semua tag HTML menggunakan regex sederhana:
     ```typescript
     const stripHtml = (html: string) => {
       return html ? html.replace(/<[^>]*>/g, "") : "";
     };
     ```

2. **Memperbaiki Bagian Pratinjau Pencarian (Baris ~160)**:
   - Ubah rendering `{q.questionText}` menjadi `{stripHtml(q.questionText)}` agar bersih dari tag HTML dalam bentuk kutipan teks.

3. **Memperbaiki Bagian Checklist Butir Soal (Baris ~269)**:
   - Ubah rendering `{q.questionText}` menjadi div yang menggunakan `dangerouslySetInnerHTML={{ __html: q.questionText }}` dengan kelas `.prose prose-sm dark:prose-invert`.

## 4. Dependencies (Dependensi)

Tidak ada dependensi eksternal baru.

## 5. Edge Cases & Error Handling (Penanganan Kasus Khusus)

- **Soal Tanpa HTML**: Jika teks soal adalah teks biasa (soal lama), helper `stripHtml` tetap mengembalikan string yang sama dengan aman, dan rendering `dangerouslySetInnerHTML` bekerja dengan normal tanpa masalah.
