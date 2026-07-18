# 📋 Strategi Pemindahan Penyimpanan JSON ke Next.js Route Cache / ISR (Vercel-Compatible)

## 1. Objective

Mengubah strategi penyimpanan berkas soal ujian statis dari sistem berkas fisik (`/public/exams/[token].json`) menjadi API Route dinamis yang memanfaatkan **Next.js Route Cache / ISR (force-static)**. Strategi ini memastikan kompatibilitas penuh dengan serverless environment seperti Vercel (yang memiliki sistem berkas read-only), sambil mempertahankan performa secepat kilat (0 rupiah, bypass database seutuhnya saat diakses banyak siswa secara bersamaan).

---

## 2. Affected Files

Berikut adalah daftar berkas yang akan dibuat atau dimodifikasi:

- [ ] `src/app/api/exams/[token]/questions/route.ts` (Baru: API Route khusus siswa untuk mengambil data soal ujian dengan dukungan caching statis Next.js)
- [ ] `src/app/api/exams/route.ts` (Modifikasi: Hapus penulisan file fisik ke `public/`, ganti dengan trigger fetch ke endpoint baru untuk meng-warm cache secara otomatis)
- [ ] `src/app/api/exams/[id]/route.ts` (Modifikasi: Hapus penghapusan file fisik, ganti dengan mekanisme revalidasi cache jika diperlukan)

---

## 3. Implementation Steps

### Langkah 1: Pembuatan API Route Baru `/api/exams/[token]/questions/route.ts`

- Buat API Route dengan segmen dinamis `[token]`.
- Atur konfigurasi Next.js Route Handler:
  ```typescript
  export const dynamic = "force-static";
  export const revalidate = false; // Gunakan On-Demand Revalidation atau cache permanen sampai direvalidasi secara manual
  ```
- Di dalam GET handler:
  1. Ambil `token` dari `params`.
  2. Cari sesi ujian (`Exam`) di database berdasarkan `token`. Pastikan status `isActive` adalah `true`. Jika tidak aktif atau tidak ditemukan, kembalikan response error.
  3. Ambil data soal beserta opsi pilihan dari `Assessment` terkait menggunakan kueri tunggal yang optimal (mencegah N+1).
  4. Lakukan sanitisasi data dengan membuang kunci jawaban (`isCorrect` atau `answerKey`).
  5. Kembalikan data ujian beserta soal-soal tersanitasi dalam format JSON.
- Gunakan fungsi `generateStaticParams()` untuk mengekspor token ujian yang sudah ada di database saat proses kompilasi/build (opsional tapi disarankan untuk keabsahan format statis Next.js).

### Langkah 2: Refaktorisasi `src/app/api/exams/route.ts` (POST)

- Hapus impor `fs` dan `path`.
- Hapus proses pembuatan direktori `public/exams` dan penulisan berkas JSON (`fs.writeFileSync`).
- Setelah data sesi ujian berhasil disimpan di database (Langkah 6 & 7):
  - Lakukan pemanggilan fetch internal (self-request) ke `/api/exams/[token]/questions` untuk memicu penyimpanan cache statis Next.js di memori Vercel saat ujian diaktifkan oleh Guru.
  - Untuk memicu fetch di serverless, gunakan URL absolut. Kita bisa mendeteksi `origin` dari header request asli atau menggunakan variabel lingkungan.
  - Kembalikan respon sukses seperti biasa.

### Langkah 3: Refaktorisasi `src/app/api/exams/[id]/route.ts` (PATCH & DELETE)

- Hapus impor `fs` dan `path` jika tidak digunakan lagi di file ini.
- Di dalam handler `DELETE`:
  - Hapus bagian kode blok try-catch yang melakukan penghapusan file fisik statis di `public/exams/[token].json`.
  - Tambahkan panggilan `revalidatePath` atau `revalidateTag` untuk membersihkan cache statis exam tersebut agar siswa tidak bisa mengakses soal setelah sesi ujian dihapus oleh Guru.
- Di dalam handler `PATCH`:
  - Jika status `isActive` diubah menjadi `false` (Ujian ditutup), pemicu revalidasi cache agar data terbaru (status tidak aktif) terperbarui di memori cache Next.js/Vercel secara instan.

---

## 4. Dependencies

Tidak ada dependensi baru yang perlu diinstal. Kita sepenuhnya mengandalkan fitur bawaan:

- Prisma Client (untuk query)
- Next.js Route Cache / On-Demand Revalidation (`revalidatePath` / `revalidateTag` dari `next/cache`)

---

## 5. Edge Cases & Error Handling

- **Token Tidak Valid / Tidak Ditemukan**: Jika siswa mengakses token yang tidak ada, kembalikan HTTP `404 Not Found` dan pastikan Next.js tidak meng缓存 response error tersebut (Next.js secara default tidak meng-cache response non-200).
- **Ujian Sudah Ditutup (`isActive: false`)**: Kembalikan pesan bahwa ujian sudah dinonaktifkan dengan status `403 Forbidden` atau `400 Bad Request`.
- **Penanganan Protokol Absolut URL**: Saat melakukan self-trigger fetch di lingkungan serverless Vercel, kita membutuhkan protokol absolut (https/http) dan host yang sesuai. Kita akan membaca dari request header `x-forwarded-proto` dan `host`.
- **Revalidasi Cache saat Sesi Dihapus/Ditutup**: Menghindari kebocoran data jika guru menghapus sesi ujian, tetapi cache di Vercel masih menyimpan soal. Kita akan menggunakan `revalidatePath` untuk memastikan data lama langsung terhapus dari cache.
