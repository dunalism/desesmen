# Rencana Pengujian Performa CBT Menggunakan k6 (300 User Simulasi)

## 1. Objective (Tujuan)

Melakukan pengujian performa mendalam (_Load & Stress Testing_) terhadap aplikasi CBT (Computer Based Test) kita menggunakan k6 dengan simulasi 300 pengguna serentak (_Virtual Users_) yang dideploy di lingkungan Vercel Preview. Pengujian akan mensimulasikan seluruh _User Journey_ siswa secara realistis dan komprehensif, mulai dari mengakses halaman login, login ujian (mengambil soal), hingga mengirim jawaban (_submit_) ke rute API dengan skenario antisipasi tabrakan beban (_jitter_).

---

## 2. Affected Files (Berkas yang Terpengaruh)

Kita akan membuat berkas-berkas pengujian baru di dalam repositori tanpa merusak atau memodifikasi kode produksi aplikasi utama:

- `planning/cbt-performance-test.md` (Berkas perencanaan ini)
- `tests/performance/cbt-load-test.js` (Skrip pengujian performa k6 utama)
- `tests/performance/README.md` (Panduan instruksi menjalankan pengujian k6 lokal/staging)

---

## 3. Implementation Steps (Langkah-Langkah Implementasi)

### Skenario Alur Pengguna (User Journey) Realistis di k6:

1.  **Akses Gerbang CBT:** Siswa membuka halaman login `/cbt` (HTTP GET).
2.  **Mulai Ujian Sekarang:** Siswa mengisi Nama, No. Absen, dan Token Ujian, lalu menekan tombol Mulai.
    - Mengambil paket soal dari API `/api/exams/${cleanToken}/questions` (HTTP GET).
    - _Fakta:_ API ini bersifat `force-static` di Vercel (ditarik lewat CDN), sehingga melatih performa caching Edge Vercel.
3.  **Simulasi Membaca & Menjawab Ujian:** Siswa berada di halaman pengerjaan `/cbt/[token]`.
    - Karena seluruh navigasi dan _autosave_ menggunakan `localStorage`/`sessionStorage` (lokal 100% tanpa internet), k6 tidak akan mengirim request jaringan saat navigasi soal untuk menghemat bandwidth dan mensimulasikan kondisi riil dengan akurat.
    - k6 akan melakukan `sleep` dengan durasi acak (misal 5 hingga 10 detik) untuk menyimulasikan waktu berpikir siswa di browser sebelum submit.
4.  **Menyelesaikan & Kirim Ujian (Submit):** Siswa menekan tombol kirim atau waktu habis.
    - Sistem melakukan perhitungan _Jitter_ acak (0 s.d 15 detik) untuk meratakan distribusi beban request masuk ke database TiDB.
    - k6 akan menyimulasikan penundaan acak ini secara akurat sebelum menembak API Submit `/api/exams/submit` (HTTP POST) untuk mereproduksi antrean pengerjaan di server sesungguhnya.
5.  **Halaman Berhasil:** Siswa diarahkan ke `/cbt/success`.

### Konfigurasi Skenario Beban k6 (300 VU):

- **Target:** 300 Virtual Users (VU) serentak.
- **Tahap (_Stages_):**
  1.  _Warm up:_ Naikkan beban perlahan dari 0 ke 300 VU dalam waktu 2 menit.
  2.  _Sustained Peak:_ Pertahankan beban puncak 300 VU selama 5 menit (mensimulasikan siswa sedang fokus mengerjakan ujian dan mulai mengirim jawaban bergantian).
  3.  _Cooldown:_ Turunkan beban perlahan kembali ke 0 VU dalam waktu 1 menit.
- **Ambang Batas (_Thresholds_):**
  - Tingkat kegagalan API (_http_req_failed_) harus di bawah **1%**.
  - Waktu respon API submit (_http_req_duration_) untuk persentil ke-95 (p95) harus di bawah **2000ms** (2 detik).

---

## 4. Dependencies (Ketergantungan Paket)

- **k6 CLI:** Harus sudah terpasang di komputer penguji (user mengonfirmasi sudah menginstalnya).
- **Tanpa paket npm tambahan:** k6 menggunakan runtime internal JavaScript (Goja engine) sehingga skrip dapat dijalankan langsung secara mandiri.

---

## 5. Edge Cases & Error Handling (Penanganan Kasus Khusus)

1.  **Penanganan Nama Siswa Unik:**
    - _Masalah:_ API submit memiliki proteksi anti-double submit berdasarkan nama siswa (`studentName`) dan ID (`studentId`). Jika 300 VU menggunakan nama yang sama, Vercel akan mengembalikan error _409 Conflict_.
    - _Solusi:_ k6 akan men-generate Nama Siswa unik secara otomatis untuk setiap iterasi Virtual User menggunakan fungsi generator dinamis (misal: `Siswa-VU-${__VU}-${__ITER}`).
2.  **Validasi Token Aktif:**
    - Sebelum menjalankan tes, pastikan Anda telah membuat satu Sesi Ujian Aktif di Dashboard dengan token yang valid (misal: `MAT-7X`). Masukkan token aktif ini ke dalam variabel lingkungan k6 (`K6_CBT_TOKEN`) atau ganti nilai variabel di dalam skrip.
3.  **Batas Timeout Vercel Serverless (10 - 15 detik):**
    - _Masalah:_ Jika database TiDB Cloud mengalami kemacetan, request submit dari Vercel ke database bisa timeout dan menghasilkan error _504 Gateway Timeout_.
    - _Solusi:_ k6 akan melacak durasi API Submit dan menandainya sebagai kegagalan jika melebihi batas waktu toleransi k6.
4.  **Validasi Format Jawaban:**
    - Payload submit di k6 harus mengikuti format asli dari database (array berisi `questionId`, `chosenOptionId`, dan `textAnswer`) agar parser autograding di serverless function berjalan normal tanpa error 400.
5.  **Koneksi Internet komputer testing tidak stabil**
    - Apabila kecepatan internet di sini sangat rendah, maka buat mitigasinya.
