# Rencana Implementasi Pembuatan Komponen `RichTextEditor.tsx`

Dokumen perencanaan ini merinci langkah-langkah untuk membuat komponen rich text editor berbasis TipTap di `src/components/ui/rich-text-editor.tsx` agar dapat digunakan oleh `InlineQuestionEditor.tsx`.

## 1. Objective (Tujuan)

- Membuat komponen `RichTextEditor.tsx` di `src/components/ui/` menggunakan `@tiptap/react`, `@tiptap/starter-kit`, dan `@tiptap/extension-underline`.
- Menyediakan toolbar UI yang intuitif dan responsif dengan fitur Bold, Italic, Underline, Bullet List, Ordered List, Code Block, dan Clear Formatting.
- Mengintegrasikan styling Tailwind CSS yang serasi dengan tema aplikasi saat ini.

## 2. Affected Files (Berkas yang Terpengaruh)

- [ ] `src/components/ui/rich-text-editor.tsx` (Membuat komponen baru)

## 3. Implementation Steps (Langkah-Langkah Implementasi)

1. **Membuat file `src/components/ui/rich-text-editor.tsx`**:
   - Impor hook `useEditor` dan komponen `EditorContent` dari `@tiptap/react`.
   - Impor `StarterKit` dari `@tiptap/starter-kit`.
   - Impor `Underline` dari `@tiptap/extension-underline`.
   - Hubungkan properti `value` (initial content) dan `onChange` (callback saat konten berubah) ke hook `useEditor`.
   - Sinkronisasi nilai luar (`value`) dengan editor TipTap menggunakan `useEffect`.
   - Rancang toolbar yang elegan berisi tombol-tombol fungsional: Bold, Italic, Underline, Bullet List, Ordered List, Code, dan Clear. Gunakan ikon dari `lucide-react`.
   - Bungkus komponen dengan styling CSS Tailwind untuk area editor, serta tambahkan focus ring dan rounded corners agar serasi dengan input field standar.

2. **Memverifikasi fungsionalitas editor**:
   - Pastikan loading state yang ada di `InlineQuestionEditor.tsx` memuat komponen ini dengan aman menggunakan dynamic import.

## 4. Dependencies (Dependensi)

- `@tiptap/react` (Sudah terinstal)
- `@tiptap/starter-kit` (Sudah terinstal)
- `@tiptap/extension-underline` (Sudah terinstal)
- `lucide-react` (Sudah terinstal)

## 5. Edge Cases & Error Handling (Penanganan Kasus Khusus)

- **SSR Hydration Issue**: TipTap memerlukan akses ke objek `window`. Karena komponen ini digunakan via `dynamic(() => import(...), { ssr: false })` di `InlineQuestionEditor.tsx`, masalah ini sudah ditangani dengan baik.
- **Sinkronisasi Loop**: Mengatasi masalah loop pembaruan state tak terbatas antara state induk dan TipTap dengan membandingkan nilai sebelum memanggil `editor.commands.setContent()`.
