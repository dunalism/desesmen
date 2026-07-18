# Panduan Pengujian Beban CBT Menggunakan k6

Dokumentasi ini memberikan instruksi langkah demi langkah tentang cara menjalankan pengujian beban (_load testing_) CBT dengan berbagai variasi jumlah siswa serentak di lingkungan lokal ataupun Vercel Preview secara aman tanpa bentrok.

## 📌 Prasyarat

Sebelum memulai, pastikan komputer Anda telah terinstal:

1. **k6 CLI** (Silakan instal dari [k6.io](https://k6.io/docs/getting-started/installation/) jika belum tersedia).
2. Sesi ujian aktif di aplikasi CBT Anda (Guru harus membuat token ujian baru di Dashboard).

---

## 🏃‍♂️ Cara Menjalankan Pengujian Beban Dinamis (Sekali Jalan / No Looping)

Kita menggunakan tipe skenario `per-vu-iterations` untuk menjamin **setiap Virtual User (VU) hanya men-submit persis 1 kali**. Anda dapat menentukan jumlah pengguna aktif secara dinamis lewat variabel `K6_VUS`.

### 1. Simulasi 50 Siswa (Sangat Aman untuk Kelas Kecil)

```bash
k6 run -e K6_VUS=50 -e K6_BASE_URL=https://desesmen.vercel.app -e K6_CBT_TOKEN=A4TR2Q tests/performance/cbt-load-test.js
```

### 2. Simulasi 100 Siswa

```bash
k6 run -e K6_VUS=100 -e K6_BASE_URL=https://desesmen.vercel.app -e K6_CBT_TOKEN=A4TR2Q tests/performance/cbt-load-test.js
```

### 3. Simulasi 150 Siswa

```bash
k6 run -e K6_VUS=150 -e K6_BASE_URL=https://desesmen.vercel.app -e K6_CBT_TOKEN=A4TR2Q tests/performance/cbt-load-test.js
```

### 4. Simulasi 200 Siswa

```bash
k6 run -e K6_VUS=200 -e K6_BASE_URL=https://desesmen.vercel.app -e K6_CBT_TOKEN=A4TR2Q tests/performance/cbt-load-test.js
```

### 5. Simulasi 250 Siswa

```bash
k6 run -e K6_VUS=250 -e K6_BASE_URL=https://desesmen.vercel.app -e K6_CBT_TOKEN=A4TR2Q tests/performance/cbt-load-test.js
```

### 6. Simulasi 300 Siswa (Uji Batas Maksimal)

```bash
k6 run -e K6_VUS=300 -e K6_BASE_URL=https://desesmen.vercel.app -e K6_CBT_TOKEN=A4TR2Q tests/performance/cbt-load-test.js
```

---

## 📊 Memahami Output Laporan k6

Setelah pengujian selesai dijalankan, k6 akan merangkum metrik performa di terminal Anda. Perhatikan metrik berikut:

1.  **`http_req_failed`**: Menunjukkan persentase request yang gagal. Harus bernilai **0.00%** (Sesuai kriteria kelaikan: di bawah 1%). Jika ada kegagalan, periksa apakah database MySQL/TiDB Anda kehabisan koneksi.
2.  **`http_req_duration`**: Waktu respon pengiriman. Sesuai kriteria ambang batas, **p(95)** (95% dari total pengiriman) harus di bawah **2000ms (2 detik)**.
3.  **`vus`**: Jumlah virtual user aktif selama pengujian berlangsung (akan mencapai puncak sesuai angka `K6_VUS` yang Anda set).
4.  **`checks`**: Memastikan asersi pengunduhan soal dan penyerahan lembar jawaban berhasil 100%.

---

## ⚠️ Catatan Keamanan & Praktik Terbaik

- **Jangan gunakan alamat Production:** Menembak domain utama produksi dengan banyak VU secara agresif berpotensi menguras kuota bandwidth Vercel Anda dan memicu firewall keamanan (Vercel Shield).
- **Gunakan Database Bayangan (Staging DB):** Pastikan Preview URL Anda terhubung ke database terpisah agar data simulasi pengujian k6 ini tidak mencemari nilai siswa riil di database utama.
