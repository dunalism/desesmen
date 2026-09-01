### ALIRAN DATA & SISTEM KEAMANAN CBT (COMPUTER BASED TEST)

Sistem CBT kita dirancang dengan prinsip **ketersediaan tinggi (High Availability), ketahanan offline (Offline Resilience), keamanan ujian yang ketat (Anti-Cheating Protection), dan nol beban tambahan pada database utama (0% database load)** selama ujian berlangsung.

Berikut adalah rincian aliran data (data flow) terbaru setelah penggabungan fitur **Live Monitoring** dan **Sistem Proteksi CBT**:

---

### 1. ALIRAN DATA CBT: PRA-UJIAN & LOGIN SISWA

#### A. Prapemanasan Cache (Pre-warm Cache) oleh Guru

Saat guru membuat atau memperbarui sesi ujian baru, server Next.js langsung memanaskan cache statis soal ujian tersebut agar siap diunduh secara instan oleh siswa.

- **Baris Kode (Internal Server Call):**
  ```typescript
  const requestUrl = new URL(request.url);
  const warmCacheUrl = `${requestUrl.origin}/api/exams/${token}/questions`;
  // Melakukan fetch internal agar Next.js mem-build cache statisnya saat ini juga (ISR)
  await fetch(warmCacheUrl);
  ```
- **Lalu Lintas Internet:** Terjadi secara internal di server untuk membangun cache halaman statis di Edge CDN.

#### B. Pemuatan Soal dari Vercel CDN (Bukan Database TiDB)

Ketika siswa mengakses halaman `/cbt` dan menekan tombol **"Mulai Ujian"**, browser mengunduh paket soal.

- **File:** `src/app/cbt/page.tsx`
- **Baris Kode:**
  ```typescript
  // Fetch static questions JSON
  const res = await fetch(`/api/exams/${cleanToken}/questions`);
  const data = await res.json();
  ```
- **Fakta Teknis:** Request ini **sama sekali tidak membebani database utama TiDB Cloud!** Rute API `/api/exams/[id]/questions` dikunci secara statis (`dynamic = "force-static"` dan `revalidate = false`), sehingga data soal dibaca langsung dari **Vercel Edge CDN Cache** super cepat layaknya file JSON statis.

#### C. Firebase Anonymous Sign-In (Kunci Live Monitoring)

Sebelum diarahkan ke halaman ujian, sistem mendaftarkan siswa secara anonim ke Firebase Auth untuk kebutuhan penulisan status monitoring.

- **File:** `src/app/cbt/page.tsx`
- **Baris Kode:**
  ```typescript
  const { signInAnonymously } = await import("firebase/auth");
  const { auth } = await import("@/lib/firebase");
  await signInAnonymously(auth);
  ```
- **Fakta Teknis:** Hal ini memungkinkan browser siswa menulis data status ujian (pulse) ke Firestore secara aman tanpa perlu proses pendaftaran manual atau membebani database utama.

#### D. Inisialisasi Penyimpanan Lokal

Setelah validasi sukses, browser mengamankan sesi awal dan waktu pengerjaan di harddisk/memori browser siswa (`localStorage`).

- **File:** `src/app/cbt/page.tsx`
- **Baris Kode:**
  ```typescript
  // Simpan sesi, penanda waktu mulai yang presisi, dan data ujian
  localStorage.setItem(
    `cbt-student-session-${cleanToken}`,
    JSON.stringify(sessionData),
  );
  localStorage.setItem(`cbt-timer-start-${cleanToken}`, Date.now().toString());
  localStorage.setItem(
    `cbt-timer-start-date-${cleanToken}`,
    new Date().toISOString(),
  );
  localStorage.setItem(`cbt-exam-data-${cleanToken}`, JSON.stringify(data));
  ```

---

### 2. SAAT UJIAN BERLANGSUNG: OFFLINE-RESILIENT, PROTEKSI KETAT, & LIVE MONITORING

Ketika halaman berpindah ke `/cbt/[token]`, siswa mulai mengerjakan soal. Pada tahap ini, seluruh proses navigasi dan pengerjaan soal adalah **100% bebas internet (offline-resilient)**, namun fitur keamanan dan monitoring aktif di latar belakang.

#### A. Sistem Proteksi CBT (Anti-Curang)

Aplikasi menerapkan protokol keamanan berlapis untuk menjamin integritas ujian:

1. **Mandatory Fullscreen (Layar Penuh Wajib):**
   Ujian wajib dikerjakan dalam mode layar penuh. Jika siswa keluar dari fullscreen, layar ujian akan ditutupi oleh overlay penangguhan (`isOutFullscreen`) yang memaksa siswa mengklik tombol **"Masuk Kembali ke Fullscreen"** agar dapat melanjutkan ujian.
2. **Deteksi Pelanggaran Otomatis (Violation Tracking):**
   - **`FULLSCREEN_EXIT`**: Siswa keluar dari mode layar penuh.
   - **`PAGE_HIDDEN`**: Siswa berpindah tab, membuka window baru, atau meminimalkan browser (dideteksi via event `visibilitychange`).
3. **Batas Toleransi Pelanggaran (Auto-Submit):**
   Siswa hanya diberikan toleransi maksimal **3 kali pelanggaran**. Pada pelanggaran ke-4, sistem secara otomatis menghentikan ujian dan mengirimkan jawaban siswa langsung ke server secara paksa.
4. **Proteksi Keyboard & Mouse:**
   Sistem menonaktifkan tombol F12, kombinasi tombol Developer Tools (`Ctrl+Shift+I`, `Ctrl+Shift+J`, `Ctrl+U`), dan menu klik kanan (`contextmenu`) untuk mencegah siswa melihat kode sumber atau menyalin konten soal.
5. **Screen Wake Lock API:**
   Mencegah layar perangkat siswa mati (sleep) atau redup selama pengerjaan ujian berlangsung.

#### B. Autosave Progres & Ketahanan Offline (0% Beban TiDB)

Setiap kali siswa memilih opsi jawaban atau mengetik jawaban esai, data langsung disimpan ke `sessionStorage` dan disinkronkan ke `localStorage`.

- **File:** `src/app/cbt/[token]/page.tsx`
- **Fakta Teknis:** Tidak ada API request ke database utama TiDB selama pengisian jawaban. Jika koneksi internet sekolah terputus di tengah-tengah ujian, siswa tetap bisa melanjutkan ujian tanpa gangguan.

#### C. Live Student Status Pulse ke Firestore (0% Beban TiDB & Tanpa Biaya Database Utama)

Ini adalah peningkatan utama. Status aktivitas siswa dikirimkan secara real-time ke **Firebase Firestore** (bukan ke TiDB) secara berkala (setiap 30 detik) dan secara instan saat terjadi kejadian tertentu (misal: fokus tab berubah, layar penuh lepas, atau submit gagal).

- **File:** `src/app/cbt/[token]/page.tsx` (`pulseStudentExam` function)
- **Data yang Dikirim (Pulse Payload):**
  - Identitas: Nama siswa dan ID/Nomor absen.
  - Progres: Jumlah soal yang sudah dijawab dibandingkan total soal.
  - Keamanan: Jumlah pelanggaran aktif (`violationCount`).
  - Status Aktivitas: `ACTIVE` (aktif mengerjakan), `IDLE` (sedang keluar fullscreen/pindah tab), `SUBMIT_FAILED` (gagal mengirim jawaban), atau `COMPLETED` (selesai).
  - Data Jawaban Sementara: Kumpulan jawaban siswa saat ini (untuk pemulihan jika terjadi crash perangkat).
- **Fakta Teknis:** Guru dapat memantau secara langsung (real-time) progres dan kejujuran seluruh siswa melalui halaman **Live Monitor** (`/dashboard/exams/[id]/monitor`) dengan **nol query database ke TiDB Cloud** dan **bebas biaya server tambahan** karena memanfaatkan kuota gratis Firebase Firestore!

---

### 3. SAAT SUBMIT JAWABAN: INTEGRASI JITTER & INSTANT GRADING

Lalu lintas internet dan penulisan ke database utama baru akan diaktifkan saat siswa menyelesaikan ujian (secara sukarela, waktu habis, atau karena diblokir akibat pelanggaran ke-4).

#### A. Proteksi Jitter (Penghalau Kemacetan Database)

Untuk mencegah ribuan siswa menembak database secara bersamaan di detik yang sama (misal saat bel ujian berbunyi), aplikasi menahan pengiriman payload di browser menggunakan **antrean waktu acak (Jitter) antara 0 hingga 15 detik**.

- **File:** `src/app/cbt/[token]/page.tsx`
- **Baris Kode:**
  ```typescript
  const jitterSeconds = Math.floor(Math.random() * 15);
  setJitterTime(jitterSeconds);
  for (let i = jitterSeconds; i >= 0; i--) {
    setJitterTime(i);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  ```

#### B. Pengiriman Data & Penulisan ke TiDB (Satu-Satunya Beban Database Utama)

Setelah masa tunggu Jitter selesai, browser mengirimkan lembar jawaban lengkap.

- **File:** `src/app/cbt/[token]/page.tsx`
- **Baris Kode:**
  ```typescript
  const response = await fetch("/api/exams/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  ```
- **Lalu Lintas Internet:** Aktif (HTTP POST).
- **Aktivitas Database (TiDB):** API `/api/exams/submit` menerima data ini, melakukan pencocokan dengan kunci jawaban asli secara instan di server (_instant grading_), lalu membuat rekaman baru di tabel `ExamAttempt` menggunakan Prisma.
- **Fakta Teknis:** Ini adalah satu-satunya momen di mana proses ujian siswa menyentuh database TiDB Cloud Anda!

#### C. Sinkronisasi Status Akhir ke Firestore

Setelah pengiriman sukses (atau jika terdeteksi konflik 409 karena lembar jawaban siswa sudah tersimpan sebelumnya), browser memperbarui status siswa di Firestore menjadi `COMPLETED`.

- **Fakta Teknis:** Jika pengiriman gagal (misal koneksi mati total saat submit), status di Firestore diubah menjadi `SUBMIT_FAILED` beserta pesan kesalahannya. Jawaban tetap disimpan aman di browser siswa, menampilkan pesan error, dan menyediakan tombol **"Kirim Ulang"** manual setelah koneksi pulih.

#### D. Pembersihan Penyimpanan Lokal & Akun Anonim (Data Cleansing & Cleanup)

Setelah dipastikan sukses (atau ditangani sebagai sukses pada konflik 409), seluruh data lokal dan akun otentikasi dibersihkan secara total demi keamanan dan kerapian sistem.

1. **Penghapusan Akun Anonim Firebase Auth**:
   Untuk mencegah penumpukan akun sampah anonim di Firebase Console, browser melakukan pemanggilan perintah hapus akun secara real-time tepat setelah status Firestore diperbarui:

   ```typescript
   const { deleteUser } = await import("firebase/auth");
   if (auth.currentUser && auth.currentUser.isAnonymous) {
     await deleteUser(auth.currentUser);
   }
   ```

   _Fakta Teknis:_ Tindakan ini **TIDAK** menghapus data/pulse pengerjaan terakhir yang sudah tersimpan di Firestore. Guru tetap bisa melihat riwayat status `"COMPLETED"` di Live Monitor.

2. **Pembersihan Cache Browser**:

   ```typescript
   localStorage.clear();
   sessionStorage.clear();
   ```

3. **Pengalihan Sesi**:
   Browser kemudian mengarahkan siswa ke halaman `/cbt/success`. Sebagai pertahanan berlapis, halaman sukses juga melakukan pembersihan cadangan jika masih terdeteksi adanya sisa akun anonim yang aktif.
