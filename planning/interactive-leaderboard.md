# Rencana Implementasi Halaman Leaderboard Interaktif (Lightweight Version)

Dokumen ini berisi rencana implementasi untuk mendesain ulang halaman leaderboard agar memiliki UX yang elegan, hidup, dan profesional dengan sentuhan interaktif tanpa membebani performa aplikasi.

## 1. Objective (Tujuan)

Mengubah halaman leaderboard (`src/app/leaderboard/[token]/page.tsx`) menjadi halaman yang merayakan kemenangan, memberikan kesan apresiasi yang mendalam kepada siswa berprestasi (Juara 3 Besar), dengan animasi murni CSS untuk performa optimal dan efek confetti interaktif saat crown Juara 1 diklik.

## 2. Affected Files (Berkas yang Terpengaruh)

- [x] `planning/interactive-leaderboard.md` (Berkas rencana ini)
- [ ] `src/app/leaderboard/[token]/page.tsx` (Implementasi visual & interaksi)

## 3. Implementation Steps (Langkah-Langkah Implementasi)

### Tahap 1: Instalasi Dependensi Terbatas

- Menginstal dependensi `canvas-confetti` dan `@types/canvas-confetti` (sebagai dev dependency) untuk mengaktifkan efek confetti.
  ```bash
  pnpm install canvas-confetti
  pnpm install -D @types/canvas-confetti
  ```

### Tahap 2: Penambahan Gaya CSS (Keyframes) di dalam Halaman

- Menyisipkan `<style>` tag atau mendefinisikan kelas animasi CSS murni di dalam file client-component agar tidak mengotori CSS global.
- Animasi yang akan ditambahkan:
  - `riseUp`: Animasi kemunculan dari bawah ke atas (`translateY` dan `opacity`) untuk podium.
  - `floatCard`: Efek melayang halus (floating) vertikal (maksimal 6px, durasi 2 detik, infinite) untuk kartu Juara 1.
  - `floatCrown`: Efek melayang halus khusus untuk mahkota (crown) Juara 1 (maksimal 4px, durasi 2 detik, infinite).
- Pengaturan delay kemunculan podium:
  - Juara 3: delay `0ms` (animasi mulai pertama)
  - Juara 2: delay `150ms`
  - Juara 1: delay `300ms`

### Tahap 3: Desain Ulang Komponen Visual Podium

- **Gaya Hover & Aktif**: Semua kartu podium ditambahkan kelas Tailwind `transition-all duration-300 hover:scale-105 active:scale-95`.
- **Dekorasi Background**: Menambahkan icon `Trophy` berukuran besar (`350px` - `500px`) di latar belakang dengan posisi `absolute`, `opacity-5` (atau `opacity-3`), dan `pointer-events-none` agar tidak menghalangi interaksi.
- **Efek Glow (Podium Glow)**:
  - Juara 1: Shadow terbesar (e.g., `shadow-xl shadow-amber-500/20` atau `glow-amber`).
  - Juara 2: Shadow sedang (e.g., `shadow-lg shadow-slate-400/10`).
  - Juara 3: Shadow terkecil (e.g., `shadow-md shadow-orange-600/5`).
- **Mahkota Interaktif (Crown Juara 1)**:
  - Dibungkus dengan elemen `<button>` yang dapat diakses melalui keyboard (`focus-visible:ring-2`, dll).
  - Memiliki `cursor-pointer` dan tooltip bawaan (`title="Klik untuk merayakan kemenangan 🎉"`).
  - Dilengkapi kelas animasi `animate-float-crown`.

### Tahap 4: Efek Confetti Interaktif & Cooldown

- Menggunakan `canvas-confetti` yang dipicu ketika tombol Crown diklik.
- Mengimplementasikan state `cooldown` (boolean) dengan durasi 3-5 detik untuk mengabaikan klik berturut-turut.
- Menjalankan efek confetti dari dua arah (kiri dan kanan) selama 2-3 detik menggunakan `requestAnimationFrame` untuk menjamin performa terbaik (frame rates stabil dan tidak ada kebocoran timer).

## 4. Dependencies (Dependensi)

- `canvas-confetti` (untuk efek selebrasi)
- `@types/canvas-confetti` (untuk ketepatan tipe TypeScript)

## 5. Edge Cases & Error Handling (Kasus Batas & Penanganan Error)

- **Aksesibilitas (A11y)**: Crown juara 1 dibungkus dalam tag `<button type="button">` agar keyboard-friendly dan memiliki label yang jelas untuk screen-readers.
- **Confetti Blocking**: Efek selebrasi confetti dirender di canvas eksternal bawaan `canvas-confetti` dengan `pointer-events-none` secara default, menjamin interaksi halaman (seperti navigasi balik atau klik peringkat lain) tetap dapat dilakukan tanpa hambatan.
- **Sizing di Mobile**: Memastikan skala podium dan animasi tidak meluber (overflow) di layar kecil. Ukuran ikon background akan disesuaikan secara responsif.
- **Mencegah Duplikasi Animasi JS**: Seluruh pergerakan kontinu (melayang/floating) dikelola murni oleh CSS engine browser, meminimalkan penggunaan CPU.
