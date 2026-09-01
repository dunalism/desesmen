# Rencana Penanganan Akumulasi Akun Anonymous Firebase Auth di CBT

## 1. Objektif

Mengatasi penumpukan akun "Anonymous" (Anonim) di Firebase Authentication Console setelah siswa menyelesaikan ujian CBT. Karena sistem CBT menggunakan token ujian (bukan pendaftaran akun siswa), masuk secara anonim (`signInAnonymously`) digunakan agar siswa bisa mengirimkan data Live Monitoring (pulse) ke Firestore. Rencana ini bertujuan untuk menghapus akun anonim tersebut secara real-time dan efisien langsung dari sisi klien (client-side) setelah tugas selesai, tanpa memerlukan server tambahan atau Cloud Functions berbayar.

---

## 2. Berkas yang Terpengaruh (Affected Files)

- [ ] `src/app/cbt/[token]/page.tsx`: Menambahkan logika penghapusan akun anonim saat siswa sukses melakukan submit ujian (baik sukses normal maupun sukses karena penanganan konflik 409).
- [ ] `src/app/cbt/success/page.tsx`: Menambahkan logika pertahanan berlapis (_defense-in-depth_) untuk mendeteksi dan menghapus akun anonim yang masih tersisa saat siswa berada di halaman sukses.
- [ ] `src/lib/flow-ujiancbt.md`: Memperbarui dokumentasi alur data ujian CBT dengan menyertakan langkah pembersihan akun anonim Firebase Auth.

---

## 3. Langkah-Langkah Implementasi (Implementation Steps)

### Langkah 1: Modifikasi `performSubmission` di `src/app/cbt/[token]/page.tsx`

Di dalam fungsi `performSubmission` (setelah Firestore sukses diperbarui dengan status `"COMPLETED"`), kita akan memanggil fungsi `deleteUser` dari `firebase/auth`.

1. **Import `deleteUser` secara dinamis** (untuk menghemat bundle size dan mencegah pemuatan sebelum diperlukan):
   ```typescript
   const { deleteUser } = await import("firebase/auth");
   const { auth } = await import("@/lib/firebase");
   ```
2. **Eksekusi penghapusan akun**:
   Hapus akun anonim siswa saat ini jika mereka login secara anonim:
   ```typescript
   if (auth.currentUser && auth.currentUser.isAnonymous) {
     await deleteUser(auth.currentUser);
     console.log("CBT Anonymous Auth user successfully deleted.");
   }
   ```
3. **Penerapan pada blok Sukses Utama** (Sekitar baris 716):
   Tepat sebelum `exitFullscreen()`, `localStorage.clear()`, dan pengalihan halaman.
4. **Penerapan pada blok Sukses Konflik 409** (Sekitar baris 756):
   Siswa yang terdeteksi double-submit (konflik 409) juga harus dibersihkan akun anonimnya.

---

### Langkah 2: Tambahkan Fungsi Pembersihan Cadangan di `src/app/cbt/success/page.tsx`

Sebagai jaring pengaman (_backup safety net_), jika terjadi gangguan koneksi atau kegagalan penghapusan di halaman pengerjaan, kita akan membersihkannya ketika siswa mendarat di halaman sukses (`/cbt/success`).

1. **Gunakan `useEffect` pada `CbtSuccessPage`**:
   ```typescript
   useEffect(() => {
     const cleanupAnonymousUser = async () => {
       try {
         const { auth } = await import("@/lib/firebase");
         const { deleteUser } = await import("firebase/auth");

         // Berikan sedikit jeda agar proses pembaruan Firestore sebelumnya selesai sepenuhnya
         await new Promise((resolve) => setTimeout(resolve, 1000));

         if (auth.currentUser && auth.currentUser.isAnonymous) {
           await deleteUser(auth.currentUser);
           console.log("CBT Anonymous Auth user cleaned up on success page.");
         }
       } catch (err) {
         console.warn(
           "Silent ignore: Failed to delete anonymous user on success page:",
           err,
         );
       }
     };
     cleanupAnonymousUser();
   }, []);
   ```

---

### Langkah 3: Perbarui Dokumentasi `src/lib/flow-ujiancbt.md`

Tambahkan sub-bab baru pada bagian **"C. Pembersihan Penyimpanan Lokal"** di alur submit jawaban, untuk menjelaskan bahwa selain menghapus cache lokal, aplikasi juga melakukan penghapusan akun anonim Firebase Auth dari sisi klien guna menjaga kebersihan Firebase Console.

---

## 4. Analisis Kasus Khusus & Penanganan Error (Edge Cases)

1. **Bagaimana dengan Data Firestore?**
   Menghapus akun autentikasi anonim (`deleteUser`) **TIDAK** akan menghapus dokumen atau data yang sudah ditulis siswa di Firestore. Data Live Monitoring (pulse) siswa tetap tersimpan dan dapat dibaca oleh Guru di Live Dashboard hingga sesi ujian ditutup. Ini sangat ideal karena kita tetap ingin rekap/pulse terakhir berstatus `"COMPLETED"`.
2. **Apakah `deleteUser` Memerlukan Re-autentikasi?**
   Pada Firebase Auth, menghapus akun pengguna sensitif memerlukan login ulang (_re-authentication_). Namun, untuk akun anonim yang baru saja dibuat di sesi yang sama, Firebase mengizinkan penghapusan instan tanpa perlu re-autentikasi karena sesi dianggap masih sangat baru (_fresh session_).
3. **Koneksi Internet Terputus Saat Submit**:
   Jika koneksi internet mati total, submit akan gagal dan siswa tetap berada di halaman ujian dengan status `SUBMIT_FAILED`. Akun anonim **tidak akan dihapus** karena mereka masih membutuhkan sesi tersebut untuk mencoba mengirim ulang (_retry_).

---

## 5. Kriteria Keberhasilan (Success Criteria)

- [ ] Akun anonim Firebase Auth berhasil dihapus secara real-time dari Firebase Console saat siswa berhasil menekan tombol "Selesai Ujian".
- [ ] Siswa tetap dapat diarahkan ke halaman `/cbt/success` dengan normal.
- [ ] Data status siswa di Firestore tetap berstatus `"COMPLETED"` (tidak terhapus dari Live Monitor Guru).
- [ ] Tidak ada akumulasi akun "sampah" anonim di Firebase Console setelah selesai ujian massal.
- [ ] Halaman sukses `/cbt/success` berfungsi sebagai pengaman berlapis yang sukses membersihkan sisa akun anonim jika ada.
