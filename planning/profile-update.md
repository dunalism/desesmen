# Rencana Fitur Update Profile (Profile Update Feature Plan)

## 1. Objective (Tujuan)

Menambahkan rute profil baru (`/dashboard/profile`) di mana pengguna dapat memperbarui foto profil (menggunakan unggah berkas gambar dengan kompresi canvas ke format Base64 ukuran kecil), nama tampilan (`displayName`), dan mengubah kata sandi (`password`).

Halaman ini akan memiliki alur sebagai berikut:

- Mengakses halaman dengan mengeklik profil di navbar/layout (`src/app/dashboard/layout.tsx`).
- Menampilkan detail profil saat ini dalam mode baca.
- Mengeklik tombol "Edit Profil" untuk masuk ke mode edit.
- Dalam mode edit, tombol simpan dinonaktifkan (`disabled`) secara default. Tombol simpan akan aktif jika ada perubahan data pada input nama, foto profil, atau bagian kata sandi.
- Melakukan konfirmasi kata sandi dan validasi kekuatan kata sandi di sisi klien.
- Menangani pembaruan kata sandi yang kedaluwarsa sesi (re-authentication) menggunakan `reauthenticateWithCredential` sebelum memanggil `updatePassword` jika terjadi error autentikasi ulang dari Firebase.
- Menampilkan animasi pemuatan (loading spinner) saat proses simpan sedang berlangsung.
- Menggunakan `showAlert` dari `DialogProvider` untuk memberi tahu pengguna secara mendetail apa saja yang berhasil diperbarui (misalnya: nama, foto, atau kata sandi).

## 2. Affected Files (Berkas yang Terpengaruh)

- `planning/profile-update.md` (Berkas rencana ini)
- `src/app/dashboard/layout.tsx` (Pembaruan tautan navigasi profil desktop & mobile)
- `src/app/dashboard/profile/page.tsx` (Pembuatan halaman baru untuk manajemen profil)

## 3. Implementation Steps (Langkah-Langkah Implementasi)

### A. Persiapan dan Navigasi (`src/app/dashboard/layout.tsx`)

1. Bungkus kontainer avatar dan informasi pengguna di bagian desktop (baris 146-156) dengan komponen `<Link href="/dashboard/profile">` agar dapat diklik dan mengarah ke halaman profil. Tambahkan efek hover agar interaktif.
2. Bungkus kontainer avatar dan informasi pengguna di bagian mobile (baris 227-244) dengan komponen `<Link href="/dashboard/profile">` dan tutup sheet menu setelah diklik dengan mengubah state `isMobileOpen` menjadi `false`.

### B. Halaman Profil Baru (`src/app/dashboard/profile/page.tsx`)

3. Buat halaman baru dengan direktori `src/app/dashboard/profile/page.tsx` menggunakan `"use client"`.
4. Impor komponen UI yang diperlukan dari `@/components/ui/`:
   - `Card`, `CardContent`, `CardHeader`, `CardTitle`, `CardDescription`
   - `Input` (gunakan kelas `h-11` untuk input yang luas)
   - `Button` (gunakan kelas `h-11` untuk tombol utama)
   - `Label`
   - `Avatar`, `AvatarImage`, `AvatarFallback`
   - `useDialog` dari `@/components/ui/dialog-provider` untuk memanggil `showAlert`.
5. Ambil status pengguna saat ini melalui hook `onAuthStateChanged` dari Firebase Auth atau gunakan instance `auth.currentUser`.
6. Siapkan state form:
   - `displayName`: string (nama lengkap)
   - `photoURL`: string (data-URI base64 atau URL eksternal)
   - `currentPassword`: string (kata sandi saat ini, wajib jika ingin ganti password)
   - `newPassword`: string (kata sandi baru)
   - `confirmPassword`: string (konfirmasi kata sandi baru)
   - `isEditing`: boolean (apakah dalam mode edit)
   - `isLoading`: boolean (apakah sedang dalam proses pengiriman data)
7. Buat utilitas kompresi foto di sisi klien (mirip dengan yang ada di Rich Text Editor tetapi dikompresi ke resolusi kecil, e.g., 120x120 piksel JPEG dengan kualitas 0.75, sehingga ukuran Base64 sangat kecil sekitar 3-8 KB, yang aman disimpan langsung di properti `photoURL` Firebase Auth).
8. Tambahkan validasi sisi klien:
   - Jika `newPassword` diisi, pastikan panjangnya minimal 6 karakter.
   - Pastikan `newPassword` sama dengan `confirmPassword`.
   - Pastikan `currentPassword` diisi jika ada perubahan kata sandi.
9. Buat fungsi untuk mengecek apakah form berubah (`hasChanges`):
   - Bandingkan `displayName` saat ini dengan `user.displayName`.
   - Bandingkan `photoURL` saat ini dengan `user.photoURL`.
   - Cek apakah input kata sandi baru diisi dan valid.
   - Jika tidak ada perubahan, tombol "Simpan" harus dinonaktifkan (`disabled`).
10. Terapkan fungsi pembaruan profil (`handleSave`):
    - Jalankan animasi loading (`isLoading = true`).
    - Lacak daftar apa saja yang berhasil diupdate (misal: `["Nama Lengkap", "Foto Profil", "Kata Sandi"]`).
    - Jika ada perubahan pada Nama atau Foto, panggil `updateProfile(auth.currentUser, { displayName, photoURL })`.
    - Jika ada perubahan pada Kata Sandi:
      - Coba jalankan `updatePassword(auth.currentUser, newPassword)`.
      - Jika gagal dengan error re-authentication (seperti sesi kedaluwarsa), dapatkan kredensial melalui `EmailAuthProvider.credential(user.email, currentPassword)`, panggil `reauthenticateWithCredential(auth.currentUser, credential)`, lalu ulangi pemanggilan `updatePassword`.
    - Setelah berhasil, matikan loading, set mode edit ke `false`, bersihkan field kata sandi, dan panggil `showAlert("Profil Diperbarui", "Selamat! Profil Anda berhasil diperbarui:\n• " + updatedFields.join("\n• "))`.

## 4. Dependencies (Ketergantungan)

- Menggunakan pustaka Firebase Auth yang sudah terpasang.
- Tidak membutuhkan pustaka eksternal baru.

## 5. Edge Cases & Error Handling (Kasus Batas & Penanganan Error)

- **Ukuran Base64 Gambar:** Jika gambar terlalu besar, kompresi canvas akan membatasinya secara otomatis ke resolusi 120x120 piksel, sehingga ukuran data string Base64 tetap sangat kecil dan tidak membebani Firebase Auth.
- **Sesi Kedaluwarsa Firebase:** Jika pengguna mencoba memperbarui kata sandi setelah lama masuk, Firebase mendeteksi aktivitas sensitif dan menolaknya. Penanganan dilakukan dengan menangkap error tersebut, melakukan `reauthenticateWithCredential` secara dinamis, lalu melanjutkan perubahan kata sandi tanpa memaksa pengguna keluar dari aplikasi.
- **Input Password Kosong:** Mengubah nama atau foto saja tidak memerlukan pengisian password saat ini. Input password hanya divalidasi jika pengguna mengetikkan kata sandi baru.

## 6. Success Criteria (Kriteria Keberhasilan)

- Navigasi dari klik profil di navbar desktop & mobile berjalan dengan lancar ke `/dashboard/profile`.
- Pengguna dapat melihat detail profil saat ini.
- Mengeklik "Edit Profil" membuka mode input. Tombol "Simpan" tetap tidak aktif sampai ada perubahan terdeteksi.
- Pengguna dapat mengunggah foto profil baru, dan foto profil tersebut diperbarui di navbar desktop & mobile secara langsung.
- Pengguna dapat mengganti nama profil.
- Pengguna dapat mengganti kata sandi dengan validasi kecocokan kata sandi baru dan penanganan re-autentikasi otomatis jika sesi kedaluwarsa.
- Menampilkan pesan alert yang rapi menggunakan dialog penjelas tentang apa saja yang sukses diubah.
