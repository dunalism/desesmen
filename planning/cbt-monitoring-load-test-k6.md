# Rencana Pembaruan Skrip Load Test k6 dengan Simulasi Monitoring CBT (Firestore Pulse)

## 1. Objective (Tujuan)

Mengubah skrip pengujian performa k6 (`tests/performance/cbt-load-test.js`) agar secara realistis mensimulasikan fitur Live Monitoring CBT yang diimplementasikan pada `src/app/cbt/[token]/page.tsx` baris 116-236.
Siswa akan disimulasikan berada di dalam ujian selama **5 menit (300 detik)**. Selama periode pengerjaan 5 menit tersebut, k6 akan mengirimkan sinyal detak jantung (Pulse) ke Firebase Firestore REST API setiap **30 detik** untuk memperbarui status pengerjaan, jumlah jawaban, durasi, dan waktu aktif terakhir siswa secara real-time. Setelah 5 menit berlalu, siswa akan mengirimkan lembar jawaban ke database TiDB Cloud via API Submit dan memperbarui status terakhir di Firestore menjadi `COMPLETED`.

---

## 2. Affected Files (Berkas yang Terpengaruh)

- `tests/performance/cbt-load-test.js` (Modifikasi untuk mengintegrasikan Firebase Anonymous Auth, Firestore REST API PATCH, dan holding loop 5 menit)

---

## 3. Implementation Steps (Langkah-Langkah Implementasi)

1. **Konfigurasi Variabel Lingkungan Firebase:**
   Menambahkan variabel lingkungan Firebase API Key dan Project ID ke dalam skrip dengan fallback nilai default yang diambil dari berkas `.env`.

   ```javascript
   const FIREBASE_API_KEY =
     __ENV.K6_FIREBASE_API_KEY || "AIzaSyDP_6iC0bVE-r-9MMMtNPKD_Lxb4F5J6ZM";
   const FIREBASE_PROJECT_ID =
     __ENV.K6_FIREBASE_PROJECT_ID || "soalgenerator21";
   ```

2. **Simulasi Firebase Anonymous Auth:**
   Sebelum siswa mulai mengirim pulse, k6 akan melakukan autentikasi anonim (Anonymous Sign-In) ke Firebase Auth via REST API untuk mendapatkan `idToken` yang valid.
   - Endpoint: `POST https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`
   - Header: `Content-Type: application/json`
   - Payload: `{"returnSecureToken": true}`

3. **Helper Format Payload Firestore REST API:**
   Membuat fungsi helper untuk menyusun objek JSON Firestore dalam format bertipe (typed JSON format) yang dibutuhkan oleh Firestore v1 REST API.
   - Kolom yang dikirim: `studentName` (string), `studentId` (string), `currentProgress` (integer), `totalQuestions` (integer), `violationCount` (integer), `lastActive` (timestamp), `status` (string), `submitError` (null/string), `answers` (array of maps), `startedAt` (string), `durationSeconds` (integer).

4. **Skenario Hold 5 Menit & Pengiriman Pulse Berkala (Setiap 30 Detik):**
   Setelah mengambil soal dan melakukan autentikasi, k6 akan mengirim pulse awal dengan status `ACTIVE` dan progres `0`.
   Selanjutnya, k6 melakukan looping sebanyak 10 kali (total 300 detik atau 5 menit):
   - Setiap iterasi melakukan `sleep(30)`.
   - Menghitung progres jawaban secara dinamis dan realistis (misalnya, progres bertambah seiring waktu pengerjaan: `Math.min(totalQuestions, Math.floor((i / 10) * totalQuestions))`).
   - Mengirim request `PATCH` ke Firestore REST API: `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/exams/${EXAM_TOKEN}/students/${studentDocumentId}?key=${FIREBASE_API_KEY}` dengan header `Authorization: Bearer ${idToken}`.
   - Melakukan asersi (`check`) untuk memastikan status pengiriman pulse berhasil (HTTP 200).

5. **Skenario Penyelesaian Ujian (API Submit & Firebase Status COMPLETED):**
   - Melakukan jeda acak jitter (0 s.d 15 detik) untuk meratakan distribusi beban database.
   - Mengirim data jawaban lengkap ke rute API Next.js `/api/exams/submit` (HTTP POST).
   - Setelah sukses submit ke database, k6 mengirim pulse final ke Firestore untuk mengubah status siswa menjadi `COMPLETED` dan membersihkan `submitError`.

---

## 4. Dependencies (Ketergantungan Paket)

- Tidak ada ketergantungan paket tambahan. Semuanya diimplementasikan menggunakan modul bawaan k6 (`k6/http` dan `k6`).

---

## 5. Edge Cases & Error Handling (Kasus Khusus & Penanganan Error)

- **Kegagalan Firebase Auth Anonim:** Jika autentikasi anonim gagal (misalnya karena kuota atau masalah jaringan), k6 tetap melanjutkan pengujian ujian (tidak mematikan seluruh VU) namun mencatat kegagalan asersi, agar pengujian rute API Next.js utama (database TiDB Cloud) tidak terganggu.
- **Format Tipe Data Firestore REST API:** Firestore REST API sangat sensitif terhadap format JSON bertipe (misal `integerValue` harus berupa string angka `"integerValue": "10"`). Kami memastikan helper menghasilkan format yang 100% valid.
- **Konflik ID Siswa Unik:** Untuk mencegah tumpang tindih data di Firestore, ID Dokumen siswa akan menggunakan kombinasi unik timestamp, VU, dan iterasi k6 (`${studentId}_${studentName}`).
- **Pengurangan Beban Loop k6:** Dengan holding pengerjaan selama 5 menit, k6 akan menahan setiap VU lebih lama sehingga jumlah total iterasi per VU berkurang namun durasi keaktifan siswa (monitored active students) di dashboard guru menjadi sangat stabil dan mencerminkan kondisi riil ruang ujian.

---

## 6. Success Criteria (Kriteria Keberhasilan)

- Skrip k6 `tests/performance/cbt-load-test.js` berhasil diperbarui dan tidak memiliki kesalahan sintaksis JS.
- Skenario holding 5 menit berhasil diimplementasikan dengan 10 kali jeda `sleep(30)` dan pengiriman pulse real-time.
- Simulasi autentikasi anonim Firebase Auth berhasil dilakukan di setiap awal sesi VU.
- Simulasi integrasi Firestore REST API PATCH berhasil dilakukan dan mengembalikan status 200 saat pengujian dijalankan.
- Data submit terkirim dengan sukses ke rute API utama di akhir pengerjaan.
- Status siswa diperbarui menjadi `COMPLETED` setelah sukses submit.
