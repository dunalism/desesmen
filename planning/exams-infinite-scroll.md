# 📋 Perencanaan Fitur Down Pagination (Infinite Scroll) untuk Sesi Ujian CBT

## 1. Objective

Mengimplementasikan pagination berbasis scroll ke bawah (Infinite Scroll) dengan memuat 6 data ujian pertama kali di halaman `/dashboard/exams`, mirip dengan implementasi pada halaman Bank Soal (`/dashboard/bank-soal`). Ini akan mereduksi beban database dan memory server saat guru memiliki puluhan atau ratusan sesi ujian.

---

## 2. Affected Files

- [ ] `src/app/api/exams/route.ts` (Modifikasi: Tambahkan parameter paginasi `page` dan `limit`, logika `skip`/`take`, perhitungan `totalCount` dan flag `hasMore` pada API GET)
- [ ] `src/app/dashboard/exams/page.tsx` (Modifikasi: Refaktorisasi pengambilan data menggunakan `useSWRInfinite` untuk infinite scroll, tambahkan sentinel ref, penanganan infinite load, tombol / spinner penanda memuat data baru)

---

## 3. Implementation Steps

### Langkah 1: Refaktorisasi GET Handler di `src/app/api/exams/route.ts`

- Baca parameter query `page` (default `"1"`) dan `limit` (default `"6"`) dari URL request.
- Hitung offset `skip = (page - 1) * limit` dan ukuran halaman `take = limit`.
- Modifikasi query Prisma `findMany` untuk `exam` dengan menyisipkan properti `skip` dan `take`.
- Hitung total sesi ujian yang relevan menggunakan kueri `prisma.exam.count({ where })`.
- Kalkulasikan flag `hasMore`: `skip + exams.length < totalCount`.
- Kembalikan response JSON yang berisi: `success`, `exams`, `totalCount`, `hasMore`, dan `nextPage`.

### Langkah 2: Refaktorisasi `src/app/dashboard/exams/page.tsx`

- Ganti penggunaan `useSWR` ke `useSWRInfinite` dari package `swr/infinite`.
- Definisikan fungsi `getKey(pageIndex, previousPageData)` untuk menyusun query string URL `/api/exams?userId=${userId}&page=${pageIndex + 1}&limit=6`.
- Satukan data list dari array nested halaman: `const exams = data ? data.flatMap((page) => page.exams) : []`.
- Implementasikan `sentinelRef` menggunakan `IntersectionObserver` untuk mendeteksi scroll hingga ke dasar halaman guna memicu pemuatan halaman data berikutnya (`setSize((prev) => prev + 1)`).
- Tambahkan loading states: `loading` untuk initial load, dan `loadingMore` untuk load halaman berikutnya.
- Tambahkan elemen UI penanda di bagian bawah halaman untuk memvisualisasikan status loading more dan penanda jika seluruh data selesai dimuat.

---

## 4. Dependencies

Tidak memerlukan instalasi package baru karena `useSWRInfinite` sudah tersedia di dalam package `swr` yang telah terinstall.

---

## 5. Edge Cases & Error Handling

- **Query Params Tidak Valid**: Jika parameter `page` atau `limit` bukan angka positif yang valid, gunakan nilai bawaan (default: page=1, limit=6).
- **Infinite Scroll Trigger Berulang**: Nonaktifkan panggilan load-more ketika status sedang fetching (`isValidating` atau `isLoading`) atau ketika `hasMore` bernilai false.
- **Kosongnya Hasil Kueri**: Menampilkan Card state kosong yang responsif jika user tidak memiliki sesi ujian sama sekali.
