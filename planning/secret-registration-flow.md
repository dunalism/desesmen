# Perencanaan Registrasi Rahasia (Mekanisme A)

Dokumen ini menjelaskan perencanaan untuk membuat halaman registrasi akun baru yang sangat aman menggunakan **Mekanisme A: Secret URL Parameter & Client-Side Verification** guna membatasi akses pendaftaran hanya kepada pemilik aplikasi yang sah (Admin).

## 1. Objective (Tujuan)

- Menyediakan rute baru `/register` yang hanya dapat diakses melalui URL khusus dengan parameter rahasia, misalnya `/register?secret=KODE_RAHASIA_ANDA`.
- Jika URL diakses tanpa parameter rahasia atau jika parameternya salah, rute `/register` secara otomatis akan dialihkan (redirect) atau memanggil `notFound()` dari Next.js sehingga menampilkan halaman **404 Not Found**.
- Membantu admin mendaftarkan akun baru secara mandiri melalui email dan password, dengan sinkronisasi ke database MySQL (lewat API Sync atau sejenisnya) agar akun terintegrasi ke sistem data pengguna.
- Menjamin flow proteksi rute dashboard (`src/middleware.ts` / layout) tidak bermasalah atau bocor karena registrasi baru ini.

## 2. Affected Files (Berkas yang Terpengaruh)

- `planning/secret-registration-flow.md` (Dokumen perencanaan ini)
- `.env` (Menambahkan variabel konfigurasi rahasia: `NEXT_PUBLIC_REGISTRATION_SECRET`)
- `src/app/register/page.tsx` (Halaman pendaftaran baru)

## 3. Implementation Steps (Langkah-Langkah Implementasi)

### Langkah 3.1: Tambahkan Konfigurasi di `.env`

- Menambahkan kunci rahasia registrasi:
  ```env
  NEXT_PUBLIC_REGISTRATION_SECRET="Epalio-rahasia-2026"
  ```
  _(Catatan: Menggunakan `NEXT_PUBLIC_` karena pencocokan URL parameter dilakukan di Client Component Next.js sebelum merender Form Registrasi).\_

### Langkah 3.2: Implementasi Halaman Registrasi (`src/app/register/page.tsx`)

1. Menggunakan `"use client"` karena halaman ini memproses interaksi pendaftaran, `useSearchParams` untuk membaca parameter, dan state Firebase.
2. Membaca query string `secret` menggunakan `useSearchParams()` dari Next.js:
   ```typescript
   const searchParams = useSearchParams();
   const secretParam = searchParams.get("secret");
   ```
3. Mencocokkan `secretParam` dengan `process.env.NEXT_PUBLIC_REGISTRATION_SECRET`.
4. Jika tidak cocok atau bernilai `null`, render halaman 404 (panggil `notFound()` dari `next/navigation`) atau lakukan pengalihan instan ke `/login` agar tidak meninggalkan jejak rute.
5. Jika cocok, tampilkan form pendaftaran yang meminta:
   - Nama Lengkap (untuk disinkronkan ke DB)
   - Email
   - Kata Sandi
   - Konfirmasi Kata Sandi
6. Menggunakan `createUserWithEmailAndPassword` dari SDK Firebase Client untuk mendaftarkan akun baru.
7. Setelah berhasil membuat akun di Firebase, lakukan sinkronisasi data pengguna ke database MySQL via endpoint API `/api/auth/sync` (endpoint sinkronisasi yang sudah ada di sistem) agar data user tersimpan di DB MySQL secara konsisten.
8. Berikan respons sukses dan arahkan pengguna ke `/dashboard`.

## 4. Dependencies (Dependensi)

Tidak ada paket npm baru yang perlu diinstal. Kita menggunakan modul bawaan yang sudah ada:

- `firebase/auth` untuk pendaftaran akun.
- `lucide-react` untuk ikon.
- `next/navigation` untuk kontrol navigasi dan pengalihan rute.

## 5. Edge Cases & Error Handling (Kasus Batas & Penanganan Error)

- **Akses Tanpa Parameter:** Jika seseorang mengetik langsung `/register`, sistem langsung memanggil `notFound()` sehingga aman dari eksploitasi URL.
- **Email Sudah Terdaftar:** Jika email sudah ada di Firebase, tampilkan pesan error yang jelas dalam Bahasa Indonesia: _"Email sudah terdaftar. Silakan gunakan email lain atau masuk di halaman login"_.
- **Password Terlalu Pendek:** Mengikuti aturan Firebase, password minimal 6 karakter. Kita berikan validasi di sisi klien sebelum data dikirim ke Firebase untuk pengalaman pengguna yang lebih baik.
- **Sinkronisasi DB Gagal:** Jika pembuatan akun Firebase sukses tetapi sinkronisasi ke DB MySQL gagal, berikan instruksi kepada pengguna untuk melakukan sinkronisasi ulang dengan masuk kembali di halaman login.
