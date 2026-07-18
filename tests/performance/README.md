# Panduan Pengujian Beban CBT Menggunakan k6

Dokumentasi ini memberikan instruksi langkah demi langkah tentang cara menjalankan pengujian beban (_load testing_) CBT dengan simulasi 300 pengguna serentak di lingkungan lokal ataupun Vercel Preview.

## 📌 Prasyarat

Sebelum memulai, pastikan komputer Anda telah terinstal:

1. **k6 CLI** (Silakan instal dari [k6.io](https://k6.io/docs/getting-started/installation/) jika belum tersedia).
2. Sesi ujian aktif di aplikasi CBT Anda (Guru harus membuat token ujian baru di Dashboard).

---

## 🏃‍♂️ Cara Menjalankan Pengujian

Anda dapat menjalankan skrip uji k6 ini dengan menyesuaikan variabel lingkungan (_environment variables_) agar menunjuk ke alamat staging/preview Anda.

### 1. Pengujian di Lingkungan Lokal (Localhost)

Untuk memastikan skrip berjalan dengan baik, lakukan uji coba singkat di komputer lokal Anda terlebih dahulu:

```bash
# Menjalankan k6 dengan target localhost (Default Token: MAT-7X2)
k6 run tests/performance/cbt-load-test.js

# Menjalankan k6 dengan token ujian lokal kustom Anda
k6 run -e K6_CBT_TOKEN=KODE_TOKEN_LOKAL_ANDA tests/performance/cbt-load-test.js
```

### 2. Pengujian di Lingkungan Vercel Preview (Disarankan untuk 300 VU)

Arahkan lalu lintas pengujian ke tautan pratinjau Vercel Anda dan token ujian aktif yang ada di database cloud:

```bash
# Ganti URL dan TOKEN sesuai dengan environment staging/preview Anda
k6 run -e K6_BASE_URL=https://soalgenerator-preview-xxx.vercel.app -e K6_CBT_TOKEN=MAT-7X2 tests/performance/cbt-load-test.js
```

---

## 📊 Memahami Output Laporan k6

Setelah pengujian selesai dijalankan, k6 akan merangkum metrik performa di terminal Anda. Perhatikan metrik berikut:

1.  **`http_req_failed`**: Menunjukkan persentase request yang gagal. Harus bernilai **0.00%** (Sesuai kriteria kelaikan: di bawah 1%). Jika ada kegagalan, periksa apakah database MySQL/TiDB Anda kehabisan koneksi.
2.  **`http_req_duration`**: Waktu respon pengiriman. Sesuai kriteria ambang batas, **p(95)** (95% dari total pengiriman) harus di bawah **2000ms (2 detik)**.
3.  **`vus`**: Jumlah virtual user aktif selama pengujian berlangsung (akan mencapai puncak di angka 300).
4.  **`checks`**: Memastikan asersi pengunduhan soal dan penyerahan lembar jawaban berhasil 100%.

---

## ⚠️ Catatan Keamanan & Praktik Terbaik

- **Jangan gunakan alamat Production:** Menembak domain utama produksi dengan 300 VU secara agresif berpotensi menguras kuota bandwidth Vercel Anda dan memicu firewall keamanan (Vercel Shield).
- **Gunakan Database Bayangan (Staging DB):** Pastikan Preview URL Anda terhubung ke database terpisah agar data simulasi pengujian k6 ini tidak mencemari nilai siswa riil di database utama.
