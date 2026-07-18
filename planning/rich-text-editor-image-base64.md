# Rencana Implementasi Fitur Gambar (Base64 + Auto Kompresi) di `RichTextEditor`

Dokumen perencanaan ini merinci langkah-langkah untuk menambahkan fitur unggah gambar berbasis Base64 dengan kompresi otomatis di sisi client di dalam komponen `RichTextEditor.tsx`.

## 1. Objective (Tujuan)

- Mengintegrasikan ekstensi `@tiptap/extension-image` untuk merender gambar di dalam editor.
- Menyediakan tombol unggah gambar ("Unggah Gambar") di toolbar editor.
- Mengimplementasikan sistem **kompresi gambar otomatis di sisi client** menggunakan canvas HTML5 sebelum mengonversi berkas gambar ke string Base64. Ini untuk memastikan ukuran file gambar di bawah **100 KB** (menghindari database MySQL membengkak).
- Memastikan rendering gambar yang responsif (max-width 100%, rounded corners, shadow) di dalam editor dan saat peninjauan soal.

## 2. Affected Files (Berkas yang Terpengaruh)

- [ ] `package.json` (Menambahkan `@tiptap/extension-image`)
- [ ] `src/components/ui/rich-text-editor.tsx` (Mengintegrasikan ekstensi image, tombol unggah, dan logika auto-kompresi)
- [ ] `src/app/globals.css` (Menambahkan styling responsif untuk gambar `.prose img`, `.tiptap img`)

## 3. Implementation Steps (Langkah-Langkah Implementasi)

1. **Instalasi Dependensi**:
   - Jalankan `pnpm install @tiptap/extension-image` untuk menambahkan dukungan gambar pada TipTap.

2. **Memperbarui `globals.css`**:
   - Tambahkan styling responsif untuk tag `img` di dalam editor dan display agar lebar gambar tidak melebihi lebar card (`max-width: 100%`, `height: auto`, `border-radius`, dll.):
     ```css
     .prose img,
     .rich-text img,
     .tiptap img {
       max-width: 100% !important;
       height: auto !important;
       border-radius: 0.5rem !important;
       margin-top: 0.75rem !important;
       margin-bottom: 0.75rem !important;
       box-shadow:
         0 4px 6px -1px rgba(0, 0, 0, 0.1),
         0 2px 4px -1px rgba(0, 0, 0, 0.06) !important;
     }
     ```

3. **Logika Kompresi Gambar di Client (`src/components/ui/rich-text-editor.tsx`)**:
   - Tulis fungsi utilitas `compressImage(file: File): Promise<string>` di dalam file komponen:
     - Menggunakan `FileReader` untuk membaca berkas gambar.
     - Menggunakan objek `Image` dan `HTMLCanvasElement` untuk menggambar ulang gambar dengan dimensi maksimal (contoh: lebar maks 600px atau tinggi maks 600px).
     - Mengekspor kembali ke format WebP atau JPEG dengan kualitas kompresi `0.7` untuk mendapatkan ukuran file sekecil mungkin (< 80KB).
     - Mengembalikan string Base64 hasil kompresi.

4. **Integrasi Toolbar & Ekstensi di `RichTextEditor.tsx`**:
   - Impor `Image` dari `@tiptap/extension-image`.
   - Daftarkan `Image` di dalam konfigurasi array `extensions` pada `useEditor`.
   - Tambahkan elemen `<input type="file" accept="image/*" className="hidden" />` yang dipicu oleh tombol gambar di toolbar.
   - Ketika gambar dipilih, jalankan fungsi kompresi gambar lalu sisipkan gambar terkompresi tersebut menggunakan `editor.chain().focus().setImage({ src: base64String }).run()`.

## 4. Dependencies (Dependensi)

- `@tiptap/extension-image` (Akan diinstal)

## 5. Edge Cases & Error Handling (Penanganan Kasus Khusus)

- **Berkas Bukan Gambar / Ukuran Sangat Besar**: Kita berikan validasi awal di client agar hanya menerima berkas gambar. Logika canvas akan mengecilkan gambar raksasa sekalipun (misal 10MB) menjadi di bawah 100KB dengan mulus.
- **Tipe Data Prisma MySQL**: Kolom text di database MySQL secara default berupa `TEXT` yang berkapasitas 64KB. Pastikan jika ada gambar, file dikompresi sekecil mungkin, atau di masa depan jika diperlukan kita bisa mengubah kolom database Prisma menjadi `MediumText` (16MB) melalui migrasi database jika ada gambar yang lebih detail.
