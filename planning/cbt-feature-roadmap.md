# 🗺️ PETA JALAN PENGEMBANGAN FITUR CBT (COMPUTER BASED TEST)

## "0 Rupiah Pun Jadi! — Solusi Skala Enterprise dengan Infrastruktur Server Gratis"

Dokumen ini berfungsi sebagai panduan arsitektur komprehensif, panduan langkah demi langkah, dan referensi kontekstual untuk pengembangan fitur CBT di aplikasi ini. Dokumen ini dirancang khusus untuk mendukung konkurensi tinggi (30+ pengguna bersamaan) di atas database gratis berkapasitas rendah (seperti Filess.io atau MySQL free tier dengan limit 5-10 koneksi) tanpa mengeluarkan biaya sepeser pun.

---

## 📌 PRINSIP UTAMA ARSITEKTUR "0 RUPIAH"

1.  **Database-Free Exam Taking (Zero DB Query Saat Ujian)**:
    Database tidak boleh diakses sama sekali selama siswa mengerjakan ujian. Soal di-load sekali di awal, pengerjaan di-handle penuh oleh browser, dan dikirim sekali di akhir.
2.  **Next.js Server Static-JSON Serving**:
    Guna menghindari crash saat 30 siswa mem-fetch soal secara bersamaan di menit yang sama, server Next.js akan menghasilkan berkas JSON statis soal (tanpa kunci jawaban!) saat Guru mengaktifkan ujian. Siswa mengunduh file JSON ini secara statis, bypass Prisma dan MySQL seutuhnya.
3.  **Client-Side LocalStorage Safe-backup (Anti Hilang Jawaban)**:
    Setiap klik pilihan jawaban siswa langsung direkam di `localStorage` komputer masing-masing. Jika browser tertutup, komputer mati, atau mati lampu, progres 100% aman dan langsung dipulihkan saat dibuka kembali.
4.  **Jitter / Staggered Delay (Antrean Acak Cerdas)**:
    Siswa tidak mengirim jawaban bersamaan. Saat tombol selesai diklik atau timer habis, browser akan menunda pengiriman secara acak antara **0 s.d. 15 detik** di sisi client. Ini meratakan 30 request submit menjadi rata-rata hanya 2 request per detik, membuat MySQL Filess.io memprosesnya dengan sangat ringan.
5.  **Strict Server-Side Grading (Anti Contek / Inspect Element)**:
    Kunci jawaban tidak pernah dikirim ke komputer siswa. Browser hanya menyimpan soal dan opsi teks. Pencocokan kebenaran jawaban dan perhitungan skor dilakukan 100% di server Next.js setelah lembar jawaban terkumpul.

---

## 🔄 ALUR PENGGUNA (USER WORKFLOW)

### A. Alur Guru (Dashboard)

1.  Guru memilih paket soal (`Assessment`) yang sudah ada.
2.  Guru menekan tombol **"Aktifkan Ujian CBT"**.
3.  Guru memasukkan detail: Judul Ujian, Durasi (Menit), Waktu Mulai, dan Waktu Selesai.
4.  Sistem secara otomatis:
    - Membuat rekaman sesi ujian (`Exam`) di database MySQL.
    - Menghasilkan **Token Ujian** acak (contoh: `MAT-7X2`).
    - Menulis berkas static JSON berisi soal-soal ujian (tanpa kunci jawaban!) ke directory server: `public/exams/[exam-token].json`.
5.  Guru membagikan Token Ujian tersebut kepada siswa.
6.  Setelah ujian selesai, Guru dapat melihat statistik hasil ujian siswa di dashboard, melihat detail jawaban salah-benar per nomor, dan mengunduh rekapitulasi nilai.

### B. Alur Siswa (CBT Engine)

1.  Siswa membuka halaman publik `/cbt`.
2.  Siswa menginput: **Nama Lengkap**, **Nomor Absen/ID**, dan **Token Ujian**.
3.  Siswa menekan tombol **"Mulai Ujian"**.
4.  Aplikasi men-download file JSON statis soal berdasarkan Token yang diinput. **(0 query database!)**
5.  Sistem mendeteksi kecocokan token, mencatat waktu mulai, dan mem-backup soal ke `localStorage`.
6.  **Ujian Berlangsung**:
    - Tampilan full-screen bersih (tanpa sidebar atau navbar aplikasi).
    - Siswa mengerjakan soal satu demi satu (navigasi nomor soal).
    - Setiap kali siswa memilih/mengubah jawaban, data langsung tersinkronisasi di `localStorage`.
    - Timer berjalan di sisi client dengan pelacak delta waktu (anti kecurangan manipulasi jam lokal).
    - Disederhanakan deteksi koneksi: jika offline, muncul banner oranye tenang agar siswa tidak panik.
7.  **Selesai Ujian**:
    - Siswa menekan tombol selesai atau waktu habis (auto-submit).
    - Sistem menghitung penundaan acak (Jitter) antara 0-15 detik.
    - Sistem menampilkan status: _"Sedang mengantre menyimpan lembar jawaban (estimasi ... detik)..."_
    - Aplikasi menembakkan request batch `POST /api/exams/submit` berisi array jawaban siswa.
    - Jika server mengembalikan status sukses (`200 OK`), data `localStorage` dihapus dan siswa diarahkan ke halaman selesai.
    - **Penyelamat Offline**: Jika pengiriman gagal (misal internet mati total), lembar jawaban **TETAP disimpan di LocalStorage**. Pengguna dapat mengklik tombol **"Kirim Ulang"** setelah koneksi tersambung kembali, atau pengawas dapat mengekspor berkas penyelamat `.cbt` secara manual.

### C. Alur Papan Peringkat (Leaderboard Publik)

1.  **Halaman Daftar Ujian Selesai (`/leaderboard`)**:
    - Akses publik tanpa perlu login untuk memelihara keringanan server dan database.
    - Menampilkan seluruh ujian (`Exam`) yang **sudah berakhir** (waktu saat ini telah melewati `endTime` atau `isActive` diset `false` oleh Guru) **DAN** properti `showLeaderboard` bernilai `true`.
2.  **Halaman Papan Peringkat Detail (`/leaderboard/[token]`)**:
    - Saat siswa memilih salah satu ujian yang selesai, halaman beralih menampilkan daftar siswa yang diurutkan berdasarkan:
      - Skor tertinggi (`score` menurun / DESC).
      - Waktu penyelesaian tercepat (`submittedAt - startedAt` menaik / ASC) jika skornya sama.
    - Papan peringkat dilengkapi efek animasi podium yang seru guna memicu semangat persaingan belajar siswa secara sehat.

---

## 🛠️ TAHAPAN IMPLEMENTASI DETIL

### 📅 Tahap 1: Database & Migrasi (SELESAI ✅)

- [x] Menambahkan model `Exam`, `ExamAttempt`, dan `StudentAnswer` ke dalam `prisma/schema.prisma` dengan relasi cascade.
- [x] Menghubungkan relasi timbal balik di model `Assessment` dan `Question`.
- [x] Validasi skema Prisma (`npx prisma validate`).
- [x] Generate ulang Prisma Client (`npx prisma generate`).

---

### 🖥️ Tahap 2: API Pembuatan Ujian & Static JSON Generator (Guru) (SELESAI ✅)

Membuat API Endpoint bagi Guru untuk membuat ujian baru dan menghasilkan berkas static JSON.

- [x] **API Route**: `POST /api/exams`
  - Menerima payload: `assessmentId`, `title`, `duration`, `startTime`, `endTime`, `showLeaderboard`, `shuffleQuestions`, `shuffleOptions`.
  - Membuat token acak alfanumerik 6 karakter (unik).
  - Menyimpan data `Exam` di database TiDB Serverless (termasuk status toggle `showLeaderboard` dan opsi pengacakan).
  - Mengambil daftar soal dari paket `Assessment` terkait, membuang semua informasi kunci jawaban (`isCorrect` dan `answerKey`), lalu mengompres struktur datanya menjadi array JSON bersih.
  - Menyimpan file JSON statis di: `/public/exams/[token].json`.
  - _Contoh isi JSON statis_:
    ```json
    {
      "examId": "exam-uuid-xyz",
      "title": "Ujian Harian Matematika",
      "duration": 60,
      "questions": [
        {
          "id": "q-uuid-1",
          "type": "MULTIPLE_CHOICE",
          "questionText": "<p>Berapakah hasil dari 2 + 2?</p>",
          "options": [
            { "id": "o-1", "optionText": "3" },
            { "id": "o-2", "optionText": "4" }
          ]
        }
      ]
    }
    ```

---

### 📊 Tahap 3: UI Manajemen Sesi Ujian (Dashboard Guru) (SELESAI ✅)

Membangun antarmuka bagi Guru untuk mengelola sesi ujian.

- [x] **Halaman SWR / Dashboard**: `/dashboard/exams`
  - Daftar sesi ujian aktif dan nonaktif yang telah dibuat guru.
  - Tombol _"Buat Sesi Ujian Baru"_ (membuka formulir/modal pemilihan paket soal dan isian durasi/token).
  - Menampilkan Token Ujian besar-besar agar mudah disalin atau ditampilkan di proyektor kelas.
  - Tombol _"Tutup Ujian"_ (untuk me-nonaktifkan status `isActive` sesi ujian secara paksa di DB).

---

### 🎨 Tahap 4: UI & Engine CBT Client-Side (Siswa) - (SELESAI ✅)

Membangun halaman pelaksanaan ujian untuk siswa yang andal, offline-safe, dan bebas gangguan.

- [x] **Halaman Login CBT**: `/cbt`
  - Formulir sederhana: Nama Lengkap, No Absen/NISN, dan Token Ujian.
  - AI Agent Note: Lakukan fetch ke API Route Statis `/api/exams/[token]/questions`. Jika sukses (status 200), simpan data identitas siswa + data soal ke dalam State/Context, lalu arahkan (router.push) ke `/cbt/[token]`. Jika gagal (status 403/404), tampilkan alert pesan error asli dari server (misal: "Ujian belum aktif").

- [x] **Halaman Pelaksanaan Ujian**: `/cbt/[token]`
  - **Focus Mode Layout**: Buat layout khusus bersih tanpa navbar/sidebar dashboard guru. Gunakan deteksi `window.addEventListener('beforeunload')` untuk mencegah siswa tidak sengaja menutup tab ujian.
  - **Sidebar Navigasi Soal**: Merender kotak-kotak nomor soal. Setiap kotak memiliki indikator warna dinamis berdasarkan State Jawaban:
    - Abu-abu = Belum dijawab (`UNANSWERED`)
    - Biru = Sudah dijawab (`ANSWERED`)
    - Kuning = Ragu-ragu (`DOUBTFUL`)
  - **Render Konten Soal**: Sediakan komponen untuk me-render HTML aman (`dangerouslySetInnerHTML` dengan pembersihan sederhana) guna menampilkan soal teks kaya dari generator AI.
  - **Engine Timer & LocalStorage Anti-Loss**:
    - Detik mundur wajib berkurang setiap 1 detik dan langsung di-backup ke `localStorage` dengan kunci `cbt-attempt-[token]`.
    - Setiap siswa memilih opsi jawaban atau mengubah status ragu-ragu, langsung perbarui `localStorage` secara instan (tanpa menunggu debouncing).
    - Jika sisa waktu mencapai `0`, kunci layar dan otomatis pemicu fungsi `handleSubmitUjian()`.

### 🔒 Tahap 5: Keamanan & Server-Side Grading Engine (SELESAI ✅)

Membangun endpoint API penerimaan jawaban yang anti-cheat, tahan duplikasi, dan hemat database.

- [x] **API Route**: `POST /api/exams/submit`
  - **Payload Format**: Menerima data dari client berupa:

    ```json
    {
      "studentName": "Nama Siswa",
      "studentId": "NISN/No Absen",
      "examToken": "TOKEN-UJIAN",
      "answers": [
        {
          "questionId": "uuid-soal",
          "chosenOptionId": "uuid-opsi-atau-null",
          "textAnswer": "string-atau-null"
        }
      ]
    }
    ```

  - **Strict Server Validation (Anti-Cheat & Latency Tolerance)**:
    - Ambil data `Exam` beserta `endTime`, `isActive`, dan seluruh kunci jawaban asli (`questions` + `options`) dari database berdasarkan `examToken`.
    - **Validasi 1 (Status Ujian)**: Jika `exam.isActive === false`, tolak dengan status 403 (Ujian sudah ditutup).
    - **Validasi 2 (Batas Waktu)**: Bandingkan `new Date()` server dengan `exam.endTime`. Berikan toleransi waktu (grace period) sebesar **60 detik** untuk mengakomodasi keterlambatan pengiriman paket data akibat internet 500kbps. Jika lewat dari batas toleransi, tolak dengan status 403.
    - **Validasi 3 (Anti Double-Submit)**: Lakukan pengecekan ke tabel `ExamAttempt`. Jika kombinasi `studentId` + `examId` sudah ada di database, langsung tolak dengan status 409 (Jawaban Anda sudah tersimpan sebelumnya).

  - **Server-side Autograding Logic**:
    - Siapkan variabel `score = 0` dan `correctCount = 0`.
    - Lakukan perulangan untuk mencocokkan jawaban siswa dengan database:
      - **MULTIPLE_CHOICE**: Cari opsi di database untuk `questionId` tersebut yang memiliki `isCorrect === true`. Jika `chosenOptionId` siswa sama dengan id opsi yang benar tersebut, maka jawaban dianggap **Benar**.
      - **TRUE_FALSE**: Bandingkan `textAnswer` siswa secara _case-insensitive_ (`.toLowerCase().trim()`) dengan `answerKey` di database (harus bernilai 'benar' atau 'salah').
      - **SHORT_ANSWER & MATCHING**: Secara bawaan, set status awal benar/salah sebagai `false` atau buat field khusus `isGraded: false` (karena jenis soal ini membutuhkan penilaian/koreksi manual oleh Guru di dashboard nanti). Namun, string `textAnswer` siswa wajib disimpan utuh.
    - Hitung nilai akhir Pilihan Ganda & Benar/Salah menggunakan rumus: `(correctCount / totalSoalDiHitung) * 100`.

  - **Prisma Atomic Transaction (All-or-Nothing)**:
    - Eksekusi penyimpanan ke database dalam **satu blok `prisma.$transaction`** tunggal untuk efisiensi koneksi internet cloud:
      1. Buat 1 entri baru di tabel `ExamAttempt` (menyimpan data siswa, score, dan waktu selesai).
      2. Buat entri massal menggunakan `createMany` ke tabel rincian jawaban siswa (menyimpan `questionId`, `chosenOptionId`, `textAnswer`, dan status `isCorrect`).
  - **Response**: Mengembalikan status `200 OK` dengan JSON `{ success: true, message: "Lembar jawaban berhasil disimpan." }`. Dilarang menampilkan nilai akhir ke siswa di response ini (nilai hanya boleh dilihat Guru di dashboard).

### 💾 Tahap 6: Backup Offline & Fitur Penyelamat Pengawas (.cbt)

Fitur tanggap darurat jika koneksi internet sekolah lumpuh total di akhir sesi ujian.

- [ ] **Logika Enkripsi & Ekspor Berkas di Browser Siswa**:
  - Jika tombol kirim ditekan saat offline, aplikasi menampilkan modal penyelamatan.
  - Menyediakan tombol **"Ekspor Lembar Jawaban (.cbt)"**.
  - Browser men-download berkas JSON terenkripsi/ter-obfuscate sederhana (berisi data jawaban siswa).
- [ ] **Dashboard Pengawas (Dashboard Guru)**:
  - Guru memiliki menu **"Unggah Berkas Jawaban Manual (.cbt)"**.
  - Guru mengunggah file `.cbt` yang dikumpulkan dari flashdisk siswa.
  - Server Next.js mendekripsi file tersebut, menghitung nilai di server, dan menyimpannya di database MySQL. Ini menjamin **tidak ada siswa yang gagal ujian karena masalah infrastruktur sekolah!**

---

### 📈 Tahap 7: Dashboard Penilaian & Statistik Siswa (Guru) - STATUS: (SELESAI ✅)

Membangun antarmuka analisis nilai, koreksi esai secara asinkron, statistik butir soal, dan fitur ekspor laporan nilai sekolah yang konsisten dengan desain UI guru sebelumnya.

- [x] **Halaman Hasil Sesi Ujian**: `/dashboard/exams/[id]/results/page.tsx`
  - **Layout & Konsistensi UI**:
    - Terapkan data fetching menggunakan `useSWR` dari endpoint `/api/exams/[id]/results`.
    - Tampilkan 4 Card Ringkasan Statistik Kelas di bagian atas menggunakan komponen `@/components/ui/card`:
      - Rata-rata Nilai Kelas (Hanya menghitung nilai yang sudah final).
      - Nilai Tertinggi.
      - Nilai Terendah.
      - Jumlah Siswa Sudah Submit.

  - **Fitur 1: Tabel Hasil Ujian Siswa (Shadcn Table Style)**:
    - Gunakan komponen `Table` dari `@/components/ui/table` untuk menampilkan daftar siswa.
    - Kolom Tabel: Nama Siswa, No Absen/NISN, Waktu Mulai & Selesai, Durasi Pengerjaan, Skor Akhir (menggunakan Badge), dan Aksi.
    - Tombol Aksi wajib berupa _"Periksa Esai"_. Ketika diklik, tombol ini akan membuka **Shadcn Dialog (`@/components/ui/dialog`)** yang menampilkan detail jawaban `SHORT_ANSWER` siswa tersebut.
    - Di dalam Dialog tersebut, sediakan `Input` angka untuk memasukkan nilai esai, serta tombol _“Simpan & Kalkulasi Ulang Skor”_ yang menembak API PATCH.

  - **Fitur 2: Analisis Statistik Butir Soal (Item Analysis)**:
    - Buat section Grid (`grid grid-cols-2 md:grid-cols-4 gap-4`) di bawah tabel utama untuk memetakan performa per nomor soal.
    - Tampilkan teks nomor soal beserta persentase tingkat kesalahan siswa (Contoh: _"Soal #5: 80% Siswa Salah"_).
    - Jika sebuah nomor soal memiliki tingkat kesalahan siswa di atas 70%, wajib berikan border warna `border-destructive`, teks merah `text-destructive`, dan ikon `AlertTriangle` dari `lucide-react`.

  - **Fitur 3: Ekspor Laporan Sekolah (Client-Side CSV Export)**:
    - Sediakan satu tombol _"Ekspor CSV"_ berwarna `variant="outline"`.
    - Implementasikan pembuatan file seutuhnya di sisi client (frontend) dengan mengonversi array data SWR menjadi string CSV murni menggunakan Blob objek, lalu mengunduhnya secara otomatis via elemen `<a>` tersembunyi.

- [x] **API Route Hasil & Koreksi**:
  - `GET /api/exams/[id]/results`: Menarik data dari tabel `ExamAttempt` dan `StudentAnswer` yang terikat dengan `examId` tersebut menggunakan kueri agregasi Prisma.
  - `PATCH /api/exams/[id]/score-essay`: Endpoint tunggal untuk menerima payload `{ attemptId, questionId, scoreEssay }` guna memperbarui nilai esai siswa di database sekaligus memicu kalkulasi ulang kolom `score` pada tabel `ExamAttempt`.

### 🏆 Tahap 8: Halaman Leaderboard Publik (Siswa) - STATUS: SIAP EKSEKUSI 🚀

Membangun antarmuka papan peringkat publik yang responsif, berkinerja tinggi, dan bebas beban login yang selaras dengan tema UI aplikasi siswa sebelumnya.

- [ ] **Halaman Daftar Ujian Publik**: `/leaderboard/page.tsx`
  - **Layout & Keamanan Data**:
    - Buat halaman publik tanpa proteksi Firebase Authentication agar siswa dapat melihat langsung tanpa login.
    - Fetch data menggunakan `useSWR` dari endpoint `/api/leaderboards`.
    - Tampilkan daftar ujian yang sudah selesai dalam bentuk komponen Grid Card (`grid grid-cols-1 md:grid-cols-3 gap-6`) menggunakan komponen `@/components/ui/card`.
    - Hanya tampilkan ujian yang memenuhi kriteria mutlak: `showLeaderboard: true` dan `isActive: false` (Ujian telah ditutup resmi oleh Guru).

- [ ] **Halaman Papan Peringkat Sesi**: `/leaderboard/[token]/page.tsx`
  - **Fitur 1: Komponen Podium Tiga Besar (Top 3 Podium)**:
    - Di bagian atas halaman, wajib merender komponen visual 3 blok podium vertikal dengan urutan posisi kiri-ke-kanan: Juara 2 (Perak), Juara 1 (Emas), Juara 3 (Perunggu).
    - Blok Juara 1 (Emas) wajib dibuat paling tinggi dengan style `bg-amber-500/10 border-amber-500 text-amber-600 dark:text-amber-400`.
    - Blok Juara 2 (Perak) menggunakan style `bg-slate-400/10 border-slate-400 text-slate-500`.
    - Blok Juara 3 (Perunggu) menggunakan style `bg-orange-600/10 border-orange-600 text-orange-700`.
    - Tampilkan Nama Siswa, Skor Akhir, dan waktu durasi pengerjaan di atas masing-masing blok podium tersebut.

  - **Fitur 2: Tabel Peringkat Susulan (Peringkat 4 dst)**:
    - Gunakan komponen `Table` dari `@/components/ui/table` untuk menampilkan siswa dari peringkat 4 hingga selesai.
    - Kolom Tabel: Peringkat (Angka), Nama Siswa, No Absen/NISN, Durasi Pengerjaan, dan Skor Akhir.
    - Terapkan style baris zebra (`even:bg-muted/40`) agar nyaman dibaca pada layar HP siswa.

- [ ] **API Route Leaderboard**:
  - `GET /api/leaderboards`: Mengambil daftar sesi ujian yang sudah tidak aktif (`isActive: false`) dan memiliki bendera `showLeaderboard: true`.
  - `GET /api/leaderboards/[token]`: Mengambil data `ExamAttempt` berdasarkan token ujian. Urutkan hasil kueri di tingkat database seutuhnya (`orderBy`) menggunakan dua parameter prioritas: `score: "desc"` (skor tertinggi) kemudian `durationSeconds: "asc"` (waktu tercepat).

## 💡 CATATAN KHUSUS UNTUK KODE KONSISTEN & SOLUTION EMAS

- **Prisma & TiDB Serverless Connection Optimization**:
  Dengan migrasi ke **TiDB Serverless**, kita tidak lagi dibatasi oleh limit koneksi MySQL gratisan konvensional (seperti 5-10 koneksi pada Filess.io). Namun, karena TiDB Serverless menggunakan model billing berbasis **Request Units (RU)**, kita harus mengoptimalkan penggunaan koneksi dan kuota RU agar tetap masuk dalam batas **FREE tier (0 Rupiah!)**:
  - Hindari koneksi bocor dengan memastikan penggunaan instance singleton `prisma` dari `src/lib/prisma.ts` secara ketat.
  - Tambahkan parameter optimal pada connection string jika diperlukan untuk membatasi pool size agar meminimalkan idle connections di lingkungan serverless:
    `DATABASE_URL="mysql://...&connection_limit=10&pool_timeout=30"`
  - TiDB Serverless sangat andal dalam menangani transaksi paralel, sehingga proses penulisan batch jawaban siswa menggunakan Prisma Transaction (`prisma.$transaction`) akan berjalan jauh lebih cepat dan aman dari deadlock dibandingkan MySQL konvensional.
- **Pencegahan Masalah N+1 Query**:
  Untuk menghemat Request Units (RU) TiDB secara masif, kita wajib menghindari kueri N+1 (di mana aplikasi melakukan kueri berulang-ulang dalam sebuah perulangan/loop):
  - Saat menghasilkan JSON statis di **Tahap 2**, tarik seluruh relasi `Assessment` -> `Question` -> `Option` dalam **satu kueri tunggal** menggunakan fitur `include` bawaan Prisma:
    ```typescript
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: {
        questions: {
          include: {
            options: true,
          },
        },
      },
    });
    ```
  - Saat melakukan grading di **Tahap 5**, jangan menembak kueri pencocokan ke database satu demi satu untuk setiap jawaban siswa. Cukup ambil data paket soal beserta kunci jawabannya sekali saja di awal menggunakan token ujian, lalu lakukan pencocokan di memori (in-memory grading).
- **Keamanan Waktu (Cheat-Proof Timer)**:
  Jangan hanya mengandalkan timer `setInterval` di client karena siswa bisa menghentikannya dengan menjeda debugger JavaScript atau mengganti jam Windows. Di awal ujian, catat `serverStartTime` dan hitung sisa durasi berdasarkan perbandingan delta `Date.now()` server asli dengan saat ini.
