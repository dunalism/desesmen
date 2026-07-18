# Rencana Implementasi: Integrasi Screen Wake Lock API pada CBT

Rencana ini menjelaskan penambahan fitur **Screen Wake Lock API** pada halaman pelaksanaan ujian CBT. Tujuannya adalah untuk mencegah layar perangkat siswa (terutama ponsel atau tablet) meredup, mati, atau terkunci otomatis selama ujian berlangsung.

## 1. Analisis Kebutuhan (Objective)

- Saat ujian CBT sedang berlangsung (`isExamStarted === true` dan belum selesai/dikirim), aplikasi akan meminta Wake Lock dari browser agar layar tetap menyala.
- Jika siswa keluar/masuk tab atau aplikasi berpindah ke latar belakang, Wake Lock dilepas secara otomatis oleh browser. Saat siswa kembali ke halaman ujian (tab menjadi aktif kembali / visible), sistem harus secara otomatis meminta Wake Lock kembali.
- Ketika ujian selesai (`isSuccess === true` atau dikirim), Wake Lock harus dilepas sepenuhnya agar tidak menguras baterai perangkat siswa.
- Penanganan error yang baik jika browser tidak mendukung Screen Wake Lock API (misalnya Safari versi lama atau browser tertentu), agar ujian tetap dapat berjalan tanpa kendala.

## 2. Berkas yang Terpengaruh (Affected Files)

- `src/app/cbt/[token]/page.tsx` - Halaman utama pelaksanaan ujian CBT.

## 3. Langkah Implementasi (Implementation Steps)

1. **Definisikan State / Reference untuk Wake Lock:**
   - Tambahkan state `wakeLockSentinel` atau gunakan `useRef` untuk menyimpan instance `WakeLockSentinel` yang didapatkan dari `navigator.wakeLock.request('screen')`. Menggunakan `useRef` sangat cocok agar tidak memicu re-render yang tidak perlu saat sentinel berubah.
2. **Fungsi Request Wake Lock:**
   - Buat fungsi asinkron `requestWakeLock` untuk meminta kunci layar agar tetap menyala jika didukung oleh browser (`'wakeLock' in navigator`).
3. **Fungsi Release Wake Lock:**
   - Buat fungsi asinkron `releaseWakeLock` untuk melepas kunci layar secara bersih saat ujian selesai atau komponen di-unmount.
4. **Gunakan React `useEffect` untuk Siklus Hidup Wake Lock:**
   - Ketika `isExamStarted` bernilai `true` dan ujian belum selesai (`!isSuccess && !submitting`), jalankan `requestWakeLock`.
   - Pasang event listener `'visibilitychange'` di tingkat dokumen. Jika halaman kembali berstatus `'visible'`, otomatis jalankan `requestWakeLock` kembali.
   - Bersihkan (clean up) event listener dan lepas wake lock saat komponen di-unmount atau status ujian berubah.

## 4. Dependensi Baru

- Tidak ada dependensi eksternal baru yang perlu dipasang. Fitur ini menggunakan Web API bawaan browser modern (_native Screen Wake Lock API_).

## 5. Penanganan Kasus Khusus & Error (Edge Cases)

- **Browser Tidak Mendukung:** Cek `'wakeLock' in navigator`. Jika tidak didukung, abaikan secara senyap tanpa menghentikan jalannya ujian.
- **Kondisi Layar Redup Sebelum Memulai:** Wake lock hanya akan diminta setelah tombol "Setuju & Mulai Ujian" ditekan oleh siswa (`isExamStarted === true`).
- **Pelepasan Otomatis:** Menangani pelepasan otomatis oleh browser saat tab kehilangan fokus, dan melakukan re-request ketika fokus kembali.
