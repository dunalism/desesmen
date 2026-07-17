# Rencana Integrasi ImgBB untuk Avatar Profile Update

## 1. Objective

Mengintegrasikan layanan upload gambar gratis **ImgBB** ke dalam fitur pembaruan profil pengguna (`src/app/dashboard/profile/page.tsx`). Hal ini bertujuan agar foto profil yang diunggah pengguna menghasilkan URL gambar permanen berdurasi pendek (kurang dari 100 karakter), sehingga dapat disimpan langsung ke dalam `photoURL` Firebase Auth tanpa memicu batas maksimal 2048 karakter. Dengan integrasi ini, trik penyimpanan Local Storage untuk Base64 yang raksasa bisa kita bersihkan secara rapi dan foto profil akan sinkron di perangkat manapun pengguna berada.

API Key ImgBB akan didukung melalui dua mekanisme:

1. **Dinamis via UI:** Ditambahkan kolom input "ImgBB API Key" di halaman Profile yang disimpan ke `localStorage` agar pengguna dapat memasukkannya sendiri secara instan dan aman.
2. **Fallback via Environment Variable:** Mendukung variabel lingkungan `NEXT_PUBLIC_IMGBB_API_KEY` di berkas `.env` jika didefinisikan oleh developer.

---

## 2. Affected Files

- [ ] `planning/profile-imgbb-integration.md` (Berkas rencana ini)
- [ ] `src/app/dashboard/profile/page.tsx` (Mengintegrasikan form input API Key, modifikasi `handlePhotoChange` untuk mengunggah ke ImgBB, serta membersihkan flow Base64)
- [ ] `src/app/dashboard/layout.tsx` (Pembersihan listener kustom `localAvatarUpdated` dan sinkronisasi otomatis menggunakan state standard Firebase Auth `photoURL`)

---

## 3. Implementation Steps

### A. Konfigurasi API Key di Profile Page

- Pengguna dapat memasukkan **ImgBB API Key** di bawah bagian Detail Profil.
- Kunci API ini disimpan secara aman di `localStorage` klien dengan key `imgbb_api_key`.
- Jika ada variabel lingkungan `process.env.NEXT_PUBLIC_IMGBB_API_KEY`, itu akan digunakan sebagai nilai fallback default (jika kolom di UI kosong).

### B. Perubahan Alur Unggah Gambar (`handlePhotoChange`)

1. Ketika pengguna memilih berkas gambar baru, kita periksa ketersediaan API Key (dari UI/Local Storage atau .env).
2. Jika tidak ada API Key, tampilkan pesan peringatan menggunakan `showAlert` agar pengguna memasukkan API Key terlebih dahulu, atau berikan petunjuk cara mendapatkannya secara gratis dari `https://api.imgbb.com/`.
3. Tampilkan status loading animasi saat proses unggah berlangsung.
4. Buat objek `FormData` dan masukkan file gambar.
5. Jalankan `fetch("https://api.imgbb.com/1/upload?key=" + apiKey, { method: "POST", body: formData })`.
6. Ambil `result.data.url` (URL pendek permanen dari ImgBB) dan set ke state `photoURL`.

### C. Alur Penyimpanan (`handleSave`)

- Karena `photoURL` sekarang adalah URL normal yang pendek, simpan langsung secara resmi menggunakan `updateProfile(user, { photoURL })`.
- Bersihkan data sampah kustom `user_avatar_base64_` dari `localStorage` untuk efisiensi penyimpanan browser lokal.
- Picu event `"localAvatarUpdated"` (atau hapus, karena Firebase Auth secara native melacak state ini jika ada sinkronisasi di dashboard). Untuk transisi yang mulus, kita akan memastikan komponen layout membaca langsung dari `user.photoURL` secara standar.

---

## 4. Dependencies

- Tidak ada modul tambahan (menggunakan `fetch` bawaan dan objek standard `FormData`).

---

## 5. Edge Cases & Error Handling

- **API Key Salah/Tidak Valid:** Tangani response gagal dari ImgBB API (status bukan 200 atau success = false) dan infokan kepada pengguna.
- **Ukuran File Terlalu Besar:** ImgBB mendukung berkas besar, tetapi kita tetap memvalidasi formatnya wajib bertipe gambar.
- **Koneksi Lambat/Timeout:** Menampilkan visual loading spinner pada foto profil agar pengguna tahu proses unggah sedang berlangsung dan tombol "Simpan Perubahan" dinonaktifkan.

---

## 6. Success Criteria

- [ ] Berhasil mengunggah gambar baru lewat halaman profil dan mendapatkan URL pendek (misalnya: `https://i.ibb.co/xxxxx/filename.jpg`).
- [ ] Perubahan foto profil disimpan ke cloud Firebase Auth dengan sukses tanpa memicu error panjang karakter.
- [ ] Perubahan foto profil otomatis tercermin secara real-time di layout samping/sidebar dashboard.
- [ ] Aplikasi lulus kompilasi `pnpm run build` dengan nol error TypeScript.
