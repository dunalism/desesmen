# Rencana Fitur Proteksi CBT (Anti-Cheating / Anti-Tab Switch) - REVISI

## 1. Objective (Tujuan)

Tujuan dari fitur ini adalah untuk meningkatkan keamanan aplikasi CBT (Computer Based Test) melalui sistem proteksi tangguh berbasis Fullscreen API dan Page Visibility API. Sistem akan memastikan murid tetap berada dalam mode fullscreen penuh dan tidak meninggalkan halaman ujian selama ujian berlangsung. Setiap tindakan mencurigakan (seperti keluar dari fullscreen atau meminimalkan/berpindah tab) akan dicatat sebagai pelanggaran. Jika batas toleransi pelanggaran dilanggar, ujian akan otomatis di-submit.

---

## 2. Affected Files (Berkas yang Terpengaruh)

- `src/app/cbt/[token]/page.tsx` (Implementasi sistem proteksi, dialog peringatan, listener event, dan UI Mulai Ujian)
- `planning/cbt-protection-feature.md` (Dokumen perencanaan ini)

---

## 3. Implementation Steps (Langkah Implementasi)

### A. UI/UX Pra-Ujian (Start Exam Gate)

1. **State Mulai Ujian (`isExamStarted`):**
   - Menambahkan state `isExamStarted` (default: `false`) untuk melacak apakah ujian telah resmi dimulai oleh murid.
   - Sebelum ujian dimulai, tampilkan layar/gerbang persiapan ("Lembar Persetujuan Mulai Ujian") yang berisi petunjuk keamanan cbt, peringatan dilarang keluar dari mode fullscreen, dan tombol utama **"Mulai Ujian & Masuk Mode Fullscreen"**.
2. **Pemicu Fullscreen (`requestFullscreen`):**
   - Ketika tombol tersebut diklik, panggil `document.documentElement.requestFullscreen()`.
   - **Jika Berhasil:** Set `isExamStarted` menjadi `true`, pasang semua event listener, dan mulai jalankan waktu ujian (timer).
   - **Jika Gagal/Ditolak:** Batalkan masuk ujian, tampilkan pesan error menggunakan `showAlert` bahwa browser menolak fullscreen (misalnya karena izin dilarang atau browser tidak didukung).

### B. Penyimpanan Sesi & Pelanggaran (Session Storage)

1. **Skema Data Sesi (`cbt-session-${token}`):**
   - Menggunakan `sessionStorage` dengan kunci `cbt-session-${token}` untuk menyimpan data cadangan pengerjaan dan pelanggaran yang bertahan saat refresh halaman namun terhapus otomatis saat tab ditutup.
   - Skema data yang disimpan dalam JSON:
     ```typescript
     interface CbtSessionData {
       violationCount: number;
       violationLog: Array<{ timestamp: string; type: string; reason: string }>;
       answers: Record<string, AnswerState>;
     }
     ```
2. **Migrasi Penyimpanan Jawaban (Local Storage ke Session Storage):**
   - Memodifikasi fungsi `saveAnswer` agar menyimpan jawaban ke dalam objek `answers` di dalam `sessionStorage` (`cbt-session-${token}`) alih-alih `localStorage` (`cbt-answers-${token}`).
   - Saat inisialisasi halaman, baca `answers`, `violationCount`, dan `violationLog` dari `sessionStorage`.

### C. Monitoring & Deteksi Pelanggaran (Event Listeners)

Saat ujian telah dimulai (`isExamStarted === true`), pasang event listener berikut secara global dan lepas ketika ujian selesai/dikirim:

1. **Monitoring Fullscreen (`fullscreenchange`):**
   - Deteksi apakah `document.fullscreenElement` bernilai null atau tidak menunjuk ke elemen halaman kita.
   - Jika mendeteksi murid keluar dari fullscreen (misalnya menekan tombol `ESC`):
     - Tambah `violationCount` sebesar 1.
     - Catat log pelanggaran ke `violationLog` di `sessionStorage`.
     - Tampilkan dialog peringatan pemblokiran layar yang meminta mereka untuk klik **"Kembali ke Fullscreen"** agar dapat melanjutkan ujian.
2. **Monitoring Halaman (`visibilitychange`):**
   - Deteksi perubahan `document.visibilityState`.
   - Jika `document.visibilityState === "hidden"` (murid berpindah tab, meminimalkan browser, atau menekan Alt+Tab):
     - Tambah `violationCount` sebesar 1.
     - Catat log pelanggaran ke `violationLog` di `sessionStorage` dengan waktu kejadian.
     - Tampilkan dialog peringatan setelah mereka kembali fokus ke tab ujian (`visible`).
3. **Keyboard Protection (`keydown`):**
   - Blokir tombol pintas pengembang dan pintasan sistem untuk mencegah kecurangan:
     - `F12`
     - `Ctrl + Shift + I`
     - `Ctrl + Shift + J`
     - `Ctrl + U` (untuk view source)
   - Metode pemblokiran menggunakan `e.preventDefault()` dan `e.stopPropagation()`.
4. **Context Menu (`contextmenu`):**
   - Cegah menu klik kanan dengan memasang listener `contextmenu` yang memanggil `e.preventDefault()`.

### D. Penanganan Batas Pelanggaran & Auto-Submit

1. **Skala Sanksi Pelanggaran:**
   - **Pelanggaran ke-1:** Tampilkan dialog peringatan pertama.
   - **Pelanggaran ke-2:** Tampilkan dialog peringatan kedua.
   - **Pelanggaran ke-3:** Tampilkan dialog peringatan terakhir.
   - **Pelanggaran ke-4:** Secara otomatis memicu fungsi `performSubmission` (Auto Submit) untuk mengirim lembar jawaban langsung ke server dan mengunci sesi ujian.
2. **Dialog Peringatan:**
   - Menampilkan dialog peringatan yang informatif dan tegas:
     ```
     ⚠️ PERINGATAN KERAS!
     Anda telah dideteksi meninggalkan halaman ujian atau keluar dari mode layar penuh.
     Jumlah Pelanggaran: {violationCount} dari 3 batas toleransi.
     Jika pelanggaran terjadi sekali lagi, jawaban Anda akan dikirim otomatis dan ujian Anda akan dihentikan!
     ```

---

## 4. Dependencies (Ketergantungan)

Tidak ada paket eksternal baru yang diinstal. Solusi ini murni menggunakan Web APIs bawaan standar browser (Fullscreen API, Page Visibility API, DOM Events) untuk performa optimal dan kompatibilitas tinggi.

---

## 5. Edge Cases & Error Handling (Kasus Khusus & Penanganan Kesalahan)

- **Pemuatan Ulang Halaman (Refresh):** Dengan memanfaatkan `sessionStorage`, data pelanggaran (`violationCount` dan `violationLog`) serta progres jawaban akan tetap utuh dan sinkron setelah halaman di-refresh.
- **Dukungan Fullscreen Browser:** Jika browser murid tidak mendukung Fullscreen API (misalnya browser lama), sistem akan mendeteksi properti `requestFullscreen` dan menolak pengerjaan dengan menampilkan petunjuk agar murid memperbarui browser mereka.
- **Pemicu Palsu (False Positives):** Batas toleransi sebanyak 3 kali diberikan untuk mengantisipasi pemicu tidak sengaja (seperti pop-up sistem operasi atau antivirus).
