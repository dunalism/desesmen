# Rencana Implementasi: Penghapusan Sinkronisasi Database di Halaman Register

Dokumen ini menjelaskan rencana untuk menghapus proses sinkronisasi database MySQL (API Sync) setelah admin berhasil mendaftar menggunakan Firebase Authentication di halaman Register (`src/app/register/page.tsx`). Sebagai gantinya, setelah pengguna berhasil didaftarkan, sistem akan langsung menampilkan pesan sukses (alert) dan mengarahkan pengguna ke dashboard.

## 1. Objective (Tujuan)

Menyederhanakan alur pendaftaran (register) admin baru di `src/app/register/page.tsx` dengan menghilangkan pemanggilan API `/api/auth/sync`. Jika pendaftaran via Firebase Authentication dan pembaruan profil berhasil, langsung tampilkan alert `"Berhasil terdaftar!"` dan arahkan pengguna ke rute `/dashboard`.

## 2. Affected Files (Berkas yang Terpengaruh)

- `src/app/register/page.tsx` (Modifikasi untuk menghapus langkah pemanggilan API `/api/auth/sync`, menambahkan alert keberhasilan, dan mengalihkan ke dashboard).

## 3. Implementation Steps (Langkah-Langkah Implementasi)

1. **Buka file `src/app/register/page.tsx`** dan cari bagian penanganan registrasi (`handleRegister`).
2. **Hapus bagian kode berikut** (Langkah 3: Sinkronisasi profil pengguna ke MySQL):

   ```typescript
   // 3. Sync user profile with MySQL using the Next.js backend API
   const syncResponse = await fetch("/api/auth/sync", {
     method: "POST",
     headers: {
       "Content-Type": "application/json",
     },
     body: JSON.stringify({
       id: user.uid,
       email: user.email,
       name: name.trim(),
     }),
   });

   if (!syncResponse.ok) {
     const syncData = await syncResponse.json();
     // Rollback Firebase session since sync with database failed
     await auth.signOut();
     throw new Error(
       syncData.error || "Gagal melakukan sinkronisasi data ke database.",
     );
   }
   ```

3. **Tambahkan pemanggilan alert** setelah pembaruan profil di Firebase Auth berhasil:
   ```typescript
   alert("Berhasil terdaftar!");
   ```
4. **Pertahankan baris pengalihan** ke dashboard setelah alert ditutup:
   ```typescript
   router.push("/dashboard");
   ```
5. **Uji coba kode** dengan melakukan verifikasi (misal: build/linting) untuk memastikan tidak ada kesalahan kompilasi.

## 4. Dependencies (Dependensi)

Tidak ada dependensi baru yang diperlukan.

## 5. Edge Cases & Error Handling (Kasus Batas & Penanganan Error)

- **Firebase Register Error:** Proses penanganan error bawaan Firebase (`auth/email-already-in-use`, `auth/weak-password`, dll.) tetap dipertahankan utuh agar pendaftar mengetahui jika pendaftaran gagal karena kesalahan kredensial atau email sudah terpakai.
