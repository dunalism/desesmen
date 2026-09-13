# Rencana Penyelarasan Pengujian Beban CBT (k6 Performance Test) dengan Fitur Terbaru

## 1. Objektif
Menyelaraskan skrip pengujian beban k6 (`tests/performance/cbt-load-test.js`) dengan arsitektur aplikasi terbaru. Kita akan melakukan dua perbaikan penting:
1. **Pembersihan Akun Anonim Firebase Auth**: Menambahkan pemanggilan Firebase Auth REST API (`accounts:delete`) di akhir skrip k6 agar setiap Virtual User (VU) yang masuk secara anonim menghapus akunnya sendiri setelah submit selesai. Ini meniru persis perilaku client-side terbaru dan mencegah penumpukan puluhan ribu akun sampah anonim di Firebase Console saat kita menjalankan pengujian beban tinggi.
2. **Koreksi Skenario Pengerjaan**: Mengoreksi konfigurasi `options` skenario pada skrip k6. Sebelumnya skrip menggunakan `ramping-vus` yang mengabaikan variabel `K6_VUS`, padahal dokumentasi README menyatakan kita menggunakan `per-vu-iterations` (di mana setiap siswa hanya mengerjakan dan men-submit tepat 1 kali). Kita akan mengubahnya ke `per-vu-iterations` menggunakan variabel dinamis `vus: TARGET_VUS` dan `iterations: 1`.

---

## 2. Berkas yang Terpengaruh (Affected Files)
- [ ] `tests/performance/cbt-load-test.js`: Memperbarui opsi skenario k6, membersihkan variabel tak terpakai, dan menyertakan hapus akun Firebase Auth REST API di bagian akhir.

---

## 3. Langkah-Langkah Implementasi (Implementation Steps)

### Langkah 1: Koreksi Opsi Skenario di `tests/performance/cbt-load-test.js`
Ubah bagian `options` konfigurasi agar menggunakan executor `per-vu-iterations` sesuai panduan README:
```javascript
const TARGET_VUS = parseInt(__ENV.K6_VUS || "50", 10);

export const options = {
  scenarios: {
    ujian_cbt: {
      executor: "per-vu-iterations",
      vus: TARGET_VUS,
      iterations: 1,
      maxDuration: "10m",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"], // Error rate <1%
    http_req_duration: ["p(95)<2000"], // 95% request selesai <2 detik
  },
};
```

---

### Langkah 2: Tambahkan Langkah Hapus Akun Anonim di Akhir Skenario
Tepat setelah status Firestore siswa diperbarui menjadi `"COMPLETED"` atau `"SUBMIT_FAILED"`, tambahkan pemanggilan POST request ke endpoint REST API Google Identity Toolkit untuk menghapus pengguna berdasarkan `idToken`:
```javascript
  // --- TAHAP 4.6: HAPUS AKUN ANONIM FIREBASE AUTH ---
  // Untuk menyamakan behavior client-side yang baru, kita hapus akun anonim k6 di akhir test
  if (idToken) {
    const deleteUserUrl = `https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${FIREBASE_API_KEY}`;
    const deletePayload = JSON.stringify({ idToken: idToken });
    const deleteHeaders = { "Content-Type": "application/json" };

    const deleteRes = http.post(deleteUserUrl, deletePayload, { headers: deleteHeaders });
    check(deleteRes, {
      "Pembersihan akun anonymous Firebase berhasil (200)": (r) => r.status === 200,
    });
  }
```

---

## 4. Antisipasi Kasus Khusus & Penanganan Error (Edge Cases)
1. **Kegagalan Hapus Akun di k6**:
   Jika penghapusan akun di k6 gagal karena batasan koneksi ke Google API dari mesin penguji, asersi `"Pembersihan akun anonymous Firebase berhasil (200)"` akan bernilai salah/gagal, namun tidak akan menggagalkan keseluruhan status http request utama dari server ujian Next.js kita.
2. **Keunikan Identitas Siswa**:
   Kombinasi `uniqueStudentId` dan `uniqueStudentName` yang menyertakan timestamp, VU, dan nomor iterasi menjamin keunikan identitas siswa di bawah ribuan request bersamaan, sehingga aman dari *unique constraint* baru kita di database (`[examId, studentId, studentName]`).

---

## 5. Kriteria Keberhasilan (Success Criteria)
- [ ] Skrip k6 `cbt-load-test.js` menggunakan skenario `per-vu-iterations` yang dinamis berbasis `K6_VUS`.
- [ ] Setiap Virtual User di k6 berhasil melakukan login anonim, mengunduh soal, mengirim pulse periodik, mengirim jawaban ke server Next.js (TiDB), memperbarui status Firestore, dan **menghapus kembali** akun anonimnya di akhir alur.
- [ ] Tidak ada penumpukan akun anonim baru yang tersisa di Firebase Console setelah simulasi pengujian k6 dijalankan.
