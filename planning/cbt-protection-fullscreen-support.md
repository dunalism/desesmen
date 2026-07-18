# Rencana Implementasi: Deteksi Dukungan Fullscreen Browser pada CBT

## 1. Objective

Mengubah flow proteksi ujian CBT pada halaman `src/app/cbt/[token]/page.tsx` agar sistem secara otomatis mendeteksi apakah browser siswa mendukung API Fullscreen atau tidak.

- **Jika mendukung (Ya):** Berlaku aturan wajib Fullscreen. Siswa harus masuk ke mode fullscreen untuk memulai ujian, dan jika keluar fullscreen maka halaman akan terkunci dan tercatat sebagai pelanggaran.
- **Jika tidak mendukung (Tidak):** Siswa tetap diperbolehkan memulai ujian secara normal tanpa fullscreen, tetapi proteksi `visibilitychange` (deteksi ganti tab/minimize) dan proteksi keyboard/klik kanan tetap aktif dan bekerja dengan normal.

## 2. Affected Files

- `src/app/cbt/[token]/page.tsx`

## 3. Implementation Steps

1. **State Deteksi Fullscreen**:
   - Tambahkan state `isFullscreenSupported` (boolean, default `true`).
   - Di dalam `useEffect` inisialisasi, lakukan pendeteksian apakah browser mendukung Fullscreen API (termasuk vendor prefixes: webkit, moz, ms) dan set nilai `isFullscreenSupported`.

2. **Modifikasi `handleStartExamSecure`**:
   - Jika `isFullscreenSupported` bernilai `true`, jalankan logika request fullscreen seperti biasa. Jika ada kegagalan, tampilkan pesan peringatan dan batalkan masuk ujian.
   - Jika `isFullscreenSupported` bernilai `false`, langsung tandai `isExamStarted = true` dan `isOutFullscreen = false` tanpa memanggil request fullscreen.

3. **Modifikasi `useEffect` Monitoring Fullscreen**:
   - Tambahkan `isFullscreenSupported` sebagai dependency.
   - Di baris pertama `useEffect`, jika `!isFullscreenSupported` bernilai `true`, langsung kembalikan (early return) agar event listener fullscreen tidak terpasang dan overlay kunci tidak pernah tampil secara keliru.

4. **Modifikasi UI Aturan (Gerbang Masuk Ujian)**:
   - Sesuaikan daftar aturan CBT berdasarkan nilai `isFullscreenSupported`.
   - Jika tidak mendukung fullscreen, ganti poin-poin tentang kewajiban fullscreen menjadi penjelasan bahwa perangkat tidak mendukung fullscreen namun proteksi ganti tab tetap aktif.

## 4. Edge Cases & Error Handling

- **Pendeteksian yang Akurat**: Deteksi harus mencakup standard `document.fullscreenEnabled` serta prefix browser lama seperti `webkitFullscreenEnabled`, `mozFullscreenEnabled`, dan `msFullscreenEnabled`.
- **Perubahan Orientasi/Ukuran Layar**: Di Safari iOS (iPhone), fullscreen API tidak didukung pada element HTML biasa (hanya didukung pada video player). Deteksi yang tepat akan membuat siswa dengan iPhone bisa mengerjakan ujian dengan lancar tanpa terblokir layar hitam, sambil tetap mendeteksi jika mereka menutup atau berpindah aplikasi/tab safari.

## 5. Success Criteria

- Browser dengan dukungan Fullscreen (misal Chrome Desktop) tetap mewajibkan masuk fullscreen dan mengunci halaman jika keluar.
- Browser tanpa dukungan Fullscreen (misal Chrome/Safari di iOS/iPhone) dapat memulai ujian dengan lancar, menampilkan soal, dan mencatat pelanggaran jika siswa berpindah tab/keluar dari browser.
- Build Next.js sukses tanpa error type check.
