# 📋 Rencana Implementasi: Tahap 4 - UI & Engine CBT Client-Side (Siswa)

Dokumen ini berisi rencana detail untuk mengimplementasikan Tahap 4 dari peta jalan pengembangan fitur CBT. Implementasi ini mencakup pembuatan halaman masuk ujian, sistem pengerjaan ujian berbasis client-side, perlindungan data lembar jawaban, serta visualisasi navigasi nomor soal yang sinkron dengan gaya UI aplikasi saat ini.

---

## 🎯 OBJECTIVE

Membangun antarmuka pengerjaan ujian CBT untuk siswa yang responsif, andal (offline-safe), aman dari kecurangan, serta bersih (Focus Mode Layout) menggunakan komponen Shadcn UI yang telah tersedia di repositori.

---

## 📂 AFFECTED FILES

Berikut adalah berkas-berkas yang akan dibuat atau dimodifikasi:

- [ ] `src/app/cbt/page.tsx` (Pembuatan halaman login ujian / input identitas & token)
- [ ] `src/app/cbt/[token]/page.tsx` (Pembuatan halaman pengerjaan ujian utama - Focus Mode)
- [ ] `src/components/cbt/CbtLayout.tsx` (Komponen layout khusus CBT tanpa sidebar/navbar aplikasi utama)
- [ ] `src/components/cbt/QuestionNavigation.tsx` (Sub-komponen sidebar navigasi nomor soal)
- [ ] `src/components/cbt/CbtTimer.tsx` (Sub-komponen pengelola timer ujian dengan sinkronisasi local storage)

---

## 🛠️ IMPLEMENTATION STEPS

### 1. Desain Halaman Login CBT (`src/app/cbt/page.tsx`)

- Menggunakan layout minimalis berpusat di tengah layar.
- Menggunakan komponen `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, dan `Input` dari folder `src/components/ui`.
- Formulir input:
  - **Nama Lengkap** (wajib diisi, minimal 3 karakter)
  - **Nomor Absen / ID Siswa** (wajib diisi)
  - **Token Ujian** (wajib diisi, otomatis huruf besar)
- Tombol **"Mulai Ujian"** yang mengaktifkan loading state.
- Logika validasi dan pre-fetch:
  - Mengirim request `GET` ke `/api/exams/[token]/questions` untuk validasi token dan mengunduh soal secara statis.
  - Jika sukses (200 OK), simpan data identitas siswa ke `localStorage` dengan kunci `cbt-student-session-[token]` dan data soal/ujian ke `localStorage` dengan kunci `cbt-exam-data-[token]`.
  - Arahkan siswa ke `/cbt/[token]`.
  - Jika gagal (misal 403 atau 404), tampilkan pesan error asli dari server menggunakan banner alert yang elegan.

### 2. Desain Komponen Layout Fokus (`src/components/cbt/CbtLayout.tsx`)

- Layout bersih penuh layar tanpa mengimpor sidebar atau navbar dashboard guru/admin.
- Menambahkan listener `window.addEventListener('beforeunload')` untuk mencegah penutupan tab secara tidak sengaja oleh siswa dengan prompt konfirmasi.
- Tampilan Header CBT:
  - Judul Ujian
  - Identitas Siswa (Nama & No Absen)
  - Timer Ujian (Waktu tersisa)
  - Status Koneksi (Indikator Online/Offline)

### 3. Engine Timer & State Manajemen (`src/components/cbt/CbtTimer.tsx` & Page Engine)

- Saat halaman `/cbt/[token]` dimuat, baca `cbt-student-session-[token]` dan `cbt-exam-data-[token]` dari `localStorage`.
- Jika data tidak ditemukan, arahkan kembali ke `/cbt`.
- Ambil data sisa durasi dari `localStorage` (kunci `cbt-timer-[token]`). Jika belum ada, gunakan durasi default dari data ujian.
- Hitung delta waktu menggunakan timestamp server (`startedAt` saat login) dibandingkan dengan `Date.now()` untuk mencegah kecurangan pengubahan waktu sistem operasi lokal.
- Ketika timer mencapai `0`, jalankan auto-submit jawaban ke server secara instan.

### 4. Navigasi Soal & Render Soal (`src/components/cbt/QuestionNavigation.tsx`)

- Panel Navigasi Soal (Sidebar Kanan atau Kiri pada layar desktop, collapsible pada mobile):
  - Kotak-kotak nomor soal dengan warna dinamis:
    - **Abu-abu**: Belum dijawab (`UNANSWERED`)
    - **Biru**: Sudah dijawab (`ANSWERED`)
    - **Kuning**: Ragu-ragu (`DOUBTFUL`)
  - Tombol pintas penanda "Ragu-ragu" yang dapat diaktifkan per soal.
- Render Konten Soal:
  - Mendukung rendering HTML kaya hasil generator AI menggunakan `dangerouslySetInnerHTML`.
  - Opsi jawaban Pilihan Ganda (A, B, C, D, E) dirender bersih menggunakan tombol interaktif yang meniru gaya radio button modern.
  - Opsi jawaban Benar/Salah atau Essay dirender menggunakan `textarea` atau radio button yang sesuai jenis soal.
  - Logika penyimpanan jawaban: Setiap kali ada klik/perubahan pilihan, simpan langsung ke `localStorage` dengan kunci `cbt-answers-[token]`.

---

## 📦 DEPENDENCIES

- Tidak memerlukan package baru tambahan. Semua kebutuhan UI dapat ditangani oleh komponen yang sudah terpasapng (`lucide-react`, `radix-ui`, `clsx`, `tailwind-merge`).

---

## ⚠️ EDGE CASES & ERROR HANDLING

1. **Mati Lampu / Browser Tertutup**: Data pengerjaan selalu di-backup ke `localStorage` pada setiap klik opsi jawaban siswa. Saat halaman direfresh atau dibuka kembali, progres dipulihkan 100%.
2. **Koneksi Terputus (Offline)**:
   - Tampilkan banner oranye tenang: _"Koneksi terputus. Lembar jawaban Anda tetap disimpan di komputer ini. Silakan lanjutkan mengerjakan ujian."_
   - Jika siswa mencoba mengirimkan jawaban saat offline, berikan petunjuk penanganan atau ekspor manual berkas cadangan (akan diimplementasikan penuh pada Tahap 6).
3. **Kecurangan Mengganti Jam Komputer**: Timer tidak menggunakan interval statis murni yang bergantung pada waktu lokal komputer. Kita akan mengukur delta waktu berjalan berdasarkan waktu mulai pertama kali yang dicatat sistem.

---

## 🏆 KRITERIA KEBERHASILAN (SUCCESS CRITERIA)

- Siswa dapat menginput token yang valid dan diarahkan ke layar ujian.
- Tampilan ujian bersih (Focus Mode), responsif, dan tombol navigasi soal berfungsi dengan warna yang sinkron.
- State pilihan jawaban langsung tersimpan di `localStorage` setiap kali diubah.
- Timer berfungsi akurat dan memicu auto-submit ketika waktu habis.
- Vercel-friendly dan terintegrasi mulus dengan database TiDB Serverless.
