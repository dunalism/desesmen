# Rencana Implementasi: Autentikasi Email & Password dengan Firebase (Tanpa Registrasi)

Dokumen ini menjelaskan rencana migrasi sistem login dari menggunakan Google Sign-In menjadi Email & Password menggunakan Firebase Authentication, tanpa halaman Registrasi, serta ditambahkan fitur Lupa Password di rute baru.

## 1. Objective (Tujuan)

Mengubah alur masuk (autentikasi) pengguna pada aplikasi agar menggunakan kombinasi Email & Password melalui Firebase Authentication Client SDK pada halaman login, sembari mempertahankan integrasi sinkronisasi data ke database MySQL (Prisma upsert). Selain itu, menambahkan halaman Lupa Password (Reset Password) di rute baru serta memastikan sistem proteksi rute (dashboard) tetap berfungsi dengan aman dan stabil.

## 2. Affected Files (File yang Terpengaruh)

- `src/app/login/page.tsx` (Modifikasi dari login Google menjadi form email/password, ditambahkan navigasi ke halaman lupa password)
- `src/app/forgot-password/page.tsx` (Membuat file baru untuk fitur lupa password dengan Firebase `sendPasswordResetEmail`)

## 3. Implementation Steps (Langkah Implementasi)

### Langkah A: Pembaruan Halaman Login (`src/app/login/page.tsx`)

1. Ubah UI agar tidak menampilkan tombol Google Login, melainkan form input email dan password:
   - Email (Input type text/email)
   - Password (Input type password)
2. Gunakan `signInWithEmailAndPassword(auth, email, password)` dari Firebase SDK untuk proses masuk.
3. Setelah login berhasil, dapatkan user dari Firebase Auth, dan lakukan sinkronisasi data pengguna ke database MySQL via `/api/auth/sync` dengan payload `id` (Firebase UID), `email`, dan `name` (misalnya diambil dari bagian depan email jika `displayName` kosong).
4. Jika sinkronisasi database gagal, lakukan logout (`await auth.signOut()`) dan tampilkan pesan kesalahan agar user tidak dapat mengakses dashboard tanpa data di DB.
5. Tambahkan link/tautan ke halaman lupa password (`/forgot-password`) jika lupa kata sandi.

### Langkah B: Pembuatan Halaman Lupa Password (`src/app/forgot-password/page.tsx`)

1. Buat halaman baru dengan input email tunggal.
2. Gunakan `sendPasswordResetEmail(auth, email)` untuk mengirimkan instruksi pemulihan kata sandi ke email pengguna.
3. Tampilkan pesan sukses bahwa email pemulihan telah dikirim, serta sediakan tombol kembali ke halaman Login (`/login`).

### Langkah C: Verifikasi Keamanan Proteksi Rute

- Karena proteksi rute di `src/app/dashboard/layout.tsx` dan halaman lainnya menggunakan `onAuthStateChanged(auth, (currentUser) => ...)` dari Firebase Auth, mekanisme ini **tidak akan terpengaruh** karena ia memantau token Firebase secara global di sisi klien, tidak peduli apakah pengguna masuk lewat Google maupun Email/Password. Proteksi rute akan tetap berfungsi 100% aman dan lancar.

## 4. Dependencies (Ketergantungan)

- Semua fungsi yang dibutuhkan (`signInWithEmailAndPassword`, `sendPasswordResetEmail`) sudah tersedia dalam package `firebase/auth` yang saat ini sudah terinstal dalam proyek. Tidak perlu menginstal package baru.

## 5. Edge Cases & Error Handling (Kasus Batas & Penanganan Error)

- **Akun Dinonaktifkan (`auth/user-disabled`):** Jika terjadi error ini saat login, tampilkan pesan alert/error khusus: `"Silakan hubungi pengembang aplikasi untuk berlangganan"`.
- **Kredensial Salah (`auth/invalid-credential` atau `auth/user-not-found`/`auth/wrong-password`):** Tampilkan pesan "Email atau kata sandi yang Anda masukkan salah."
- **Format Email Tidak Valid (`auth/invalid-email`):** Tampilkan "Format email tidak valid."
- **Password Kosong / Terlalu Pendek:** Berikan validasi di sisi klien sebelum submit.
- **Rollback Sesi:** Jika login Firebase sukses tetapi sinkronisasi ke DB gagal (misal server DB down/error), aplikasi akan memanggil `await auth.signOut()` untuk mencopot sesi agar konsisten.
