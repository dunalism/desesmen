# Rencana Implementasi: Penghapusan Sinkronisasi Database di Halaman Login

Dokumen ini menjelaskan rencana untuk menghapus proses sinkronisasi database MySQL (API Sync) setelah pengguna berhasil login menggunakan Firebase Authentication di halaman Login (`src/app/login/page.tsx`). Sebagai gantinya, setelah pengguna berhasil masuk, sistem akan langsung menampilkan pesan sukses (alert) dan mengarahkan pengguna ke dashboard.

## 1. Objective (Tujuan)

Menyederhanakan alur masuk (login) pengguna di `src/app/login/page.tsx` dengan menghilangkan pemanggilan API `/api/auth/sync`. Jika login menggunakan Firebase Authentication berhasil, langsung tampilkan alert `"Berhasil terdaftar!"` (atau `"Berhasil masuk!"`) dan arahkan pengguna ke rute `/dashboard`.

## 2. Affected Files (Berkas yang Terpengaruh)

- `src/app/login/page.tsx` (Modifikasi untuk menghapus langkah pemanggilan API `/api/auth/sync` dan menambahkan alert keberhasilan).

## 3. Implementation Steps (Langkah-Langkah Implementasi)

1. **Buka file `src/app/login/page.tsx`** dan cari bagian penanganan login email (`handleEmailLogin`).
2. **Hapus bagian kode berikut** (Langkah 2: Sinkronisasi profil pengguna ke MySQL):

   ```typescript
   // 2. Sync user profile with MySQL using Next.js backend API
   const displayName = user.displayName || user.email.split("@")[0];
   const syncResponse = await fetch("/api/auth/sync", {
     method: "POST",
     headers: {
       "Content-Type": "application/json",
     },
     body: JSON.stringify({
       id: user.uid,
       email: user.email,
       name: displayName,
     }),
   });

   if (!syncResponse.ok) {
     const syncData = await syncResponse.json();
     // Rollback Firebase session since sync with DB failed
     await auth.signOut();
     throw new Error(
       syncData.error || "Gagal melakukan sinkronisasi data ke database.",
     );
   }
   ```

3. **Tambahkan alert** setelah Firebase sign-in berhasil:
   ```typescript
   alert("Berhasil terdaftar!");
   ```
4. **Pertahankan baris pengalihan** ke dashboard setelah alert ditutup:
   ```typescript
   router.push("/dashboard");
   ```
5. **Uji coba kode** untuk memastikan tidak ada kesalahan kompilasi atau linting.

## 4. Dependencies (Dependensi)

Tidak ada dependensi baru yang diperlukan.

## 5. Edge Cases & Error Handling (Kasus Batas & Penanganan Error)

- **Firebase Sign-in Error:** Proses penanganan error bawaan Firebase (`auth/user-disabled`, `auth/invalid-credential`, dll.) tetap dipertahankan agar pengguna tahu jika ada kesalahan kredensial saat masuk.
