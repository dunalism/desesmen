# 📋 RENCANA IMPLEMENTASI: CBT LIVE MONITORING DENGAN FIREBASE FIRESTORE (PEMANTAUAN UJIAN REAL-TIME 100% BEBAS BEBAN DATABASE UTAMA)

Dokumen ini berisi rencana pengembangan untuk membuat halaman **Monitoring Ujian yang Sedang Berlangsung (CBT Live Monitoring)** bagi Guru. Fitur ini dirancang agar tetap mempertahankan resiliensi offline (offline-resilient) siswa, mendeteksi kendala pengerjaan maupun kegagalan pengiriman (submit) jawaban secara dini, serta **tidak membebani database utama (TiDB Cloud MySQL) dan server Next.js kita sama sekali (0% beban server)** dengan memanfaatkan Firebase Firestore Free Tier.

---

## 1. OBJECTIVE (Tujuan)

Membangun sistem pemantauan real-time yang memungkinkan Guru untuk:

1. Memantau status keaktifan siswa (Aktif, Idle/Pindah Tab, Terputus/Offline, Selesai).
2. Memantau progres pengerjaan siswa (jumlah soal terjawab).
3. Memantau jumlah pelanggaran keamanan secara langsung (keluar dari fullscreen / pindah tab).
4. **[FITUR UTAMA]** Mendeteksi secara dini apabila siswa mengalami kendala/kegagalan saat menekan tombol "Selesai" (Submit), lengkap dengan penyebab kesalahan/kendalanya (misal: Wi-Fi terputus, Sesi ujian ditutup, Server error 500, dll), sehingga guru pengawas dapat langsung membantu ke meja siswa yang bersangkutan.
5. **[SUPER FITUR - SUBMIT OLEH GURU]**: Guru dapat men-submit lembar jawaban siswa langsung dari halaman monitor guru jika siswa mengalami kendala teknis (mati lampu, laptop rusak, atau internet putus total di meja siswa) namun datanya sudah berhasil terunggah ke Firestore sebagai detak terakhir.
6. Mempertahankan prinsip **resiliensi offline**: jika koneksi internet siswa mati di tengah ujian, siswa tidak akan diganggu oleh error connection. Sinyal pemantauan (Pulse) akan gagal secara senyap (silent failure), dan akan terkirim kembali secara otomatis begitu internet kembali normal.
7. **Zero Cost & Zero Database Load (Nol Beban Database Utama)**: Dengan mengirimkan Pulse langsung dari browser siswa ke Firestore Database, kita melompati server Next.js dan TiDB Cloud kita sepenuhnya selama ujian berlangsung.
8. **Siswa Tanpa Login (Bypass Security)**: Siswa yang tidak login di aplikasi (menggunakan token akses CBT) dapat mengirimkan data secara lancar langsung ke Firestore dengan melakukan konfigurasi khusus pada **Firestore Security Rules** atau secara dinamis masuk menggunakan **Firebase Anonymous Authentication** yang mulus di background pengerjaan soal.

---

## 2. AFFECTED FILES (Berkas yang Terpengaruh)

- `src/lib/firebase.ts` (Mengekspos instansi `db` / Firestore Database untuk pengerjaan & monitor)
- `src/app/cbt/[token]/page.tsx` (Mengintegrasikan pengiriman Heartbeat/Pulse otomatis langsung ke Firestore, pelaporan kendala submit, dan pembersihan data saat submit sukses)
- `src/app/dashboard/exams/[id]/monitor/page.tsx` (Halaman dashboard baru bagi guru untuk visualisasi pemantauan real-time menggunakan realtime listener Firestore)
- `src/app/dashboard/exams/page.tsx` (Menyediakan tombol navigasi/aksi "Monitor Live" di daftar ujian guru)

---

## 3. IMPLEMENTATION STEPS (Langkah-langkah Implementasi)

### A. Konfigurasi Firebase Firestore (`src/lib/firebase.ts`)

Kita akan mengekspos instansi Firestore dari file konfigurasi Firebase yang sudah ada.

```typescript
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore"; // Import Firestore

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app); // Inisialisasi Firestore
const googleProvider = new GoogleAuthProvider();

export { app, auth, db, googleProvider };
```

---

### B. Desain Struktur Dokumen Firestore (NoSQL)

Kita akan menyimpan data heartbeat di bawah koleksi terstruktur berikut:

- **Path Dokumen**: `/exams/{examId}/students/{studentId}` (atau `{examId}/students/{studentId}_{studentName}` agar unik jika studentId kosong/sama).
- **Struktur Dokumen**:
  ```json
  {
    "studentName": "Budi Santoso",
    "studentId": "05",
    "currentProgress": 12,
    "totalQuestions": 20,
    "violationCount": 1,
    "lastActive": "TIMESTAMP_SERVER_FIREBASE",
    "status": "ACTIVE", // ACTIVE, IDLE, OFFLINE, COMPLETED, SUBMIT_FAILED
    "submitError": "TypeError: Failed to fetch", // null jika tidak ada error submit
    "answers": [
      // Payload seluruh jawaban sementara siswa dikirimkan agar Guru dapat membantu submit secara paksa jika komputer siswa rusak
      {
        "questionId": "uuid-soal-1",
        "chosenOptionId": "uuid-opsi-A",
        "textAnswer": null
      }
    ],
    "startedAt": "Waktu mulai siswa (String)",
    "durationSeconds": 345 // Durasi detik pengerjaan siswa hingga pulse dikirim
  }
  ```

---

### B2. Keamanan Firestore Tanpa Login Siswa (Security Rules & Anonymous Sign-In)

Siswa CBT kita masuk tanpa login (hanya menginput Nama & Token). Agar siswa bisa menulis ke Firestore dengan aman dan gratis:

1. **Opsi 1: Anonymous Authentication (Rekomendasi - Super Aman & Mulus)**:
   - Begitu siswa menekan tombol "Mulai Ujian", browser siswa akan memicu fungsi `signInAnonymously(auth)` secara senyap di background.
   - Cara ini memberikan token session Firebase aman kepada siswa secara instan (0.1 detik) tanpa memerlukan password/email/Google login.
   - Di sisi Firestore Security Rules, kita cukup mengizinkan penulisan bagi user yang terautentikasi:
     ```javascript
     match /exams/{examId}/students/{studentId} {
       allow read, write: if request.auth != null;
     }
     ```
2. **Opsi 2: Aturan Firestore Publik Terbatas (Sederhana)**:
   - Kita mengizinkan tulis publik khusus di bawah koleksi sub-students:
     ```javascript
     match /exams/{examId}/students/{studentId} {
       allow read, write: if true;
     }
     ```
     Kita akan menerapkan **Opsi 1 (Anonymous Sign-In)** karena sangat mudah diterapkan di kode Next.js menggunakan Firebase Web SDK dan menjaga keamanan database Firestore kita dari eksploitasi spam luar secara gratis!

---

### C. Pengembangan Sisi Client Siswa (`src/app/cbt/[token]/page.tsx`)

Kita akan mengintegrasikan pengiriman detak jantung (Pulse) langsung ke Firestore secara asinkron tanpa membebani browser siswa.

1. **State Baru**:
   - `const [submitError, setSubmitError] = useState<string | null>(null);`
2. **Fungsi Mengirim Pulse ke Firestore**:
   - Kita akan mengimpor `doc` dan `setDoc` serta `serverTimestamp` dari `firebase/firestore`.
   - Mengirim Pulse secara asinkron:

     ```typescript
     const pulseStudentExam = async (statusOverride?: string) => {
       if (!isExamStarted || isSuccess || submitting) return;
       try {
         const studentRef = doc(
           db,
           "exams",
           exam.id,
           "students",
           `${studentId}_${name}`,
         );

         // Hitung total detik pengerjaan sejak siswa mulai
         const startMs = localStorage.getItem(`cbt-timer-start-${exam.token}`);
         const currentSecs = startMs
           ? Math.floor((Date.now() - parseInt(startMs)) / 1000)
           : 0;

         await setDoc(
           studentRef,
           {
             studentName: name.trim(),
             studentId: studentId.trim(),
             currentProgress: answers.filter(
               (a) => a.chosenOptionId || a.textAnswer,
             ).length,
             totalQuestions: questions.length,
             violationCount: violationCount,
             lastActive: serverTimestamp(),
             status:
               statusOverride ||
               (submitError ? "SUBMIT_FAILED" : isIdle ? "IDLE" : "ACTIVE"),
             submitError: submitError,
             answers: answers, // Kirimkan payload jawaban sementara secara utuh
             startedAt:
               localStorage.getItem(`cbt-timer-start-date-${exam.token}`) ||
               new Date().toISOString(),
             durationSeconds: currentSecs,
           },
           { merge: true },
         );
       } catch (err) {
         // Silent failure - abaikan secara senyap jika koneksi internet siswa mati
         console.warn("Pulse failed silently (Offline mode active):", err);
       }
     };
     ```

#### 2. Aktivasi Firebase Anonymous Sign-In di Halaman Mulai Ujian (`src/app/cbt/page.tsx`)

- Sebelum mengarahkan siswa ke halaman pengerjaan (`/cbt/[token]`), kita panggil `signInAnonymously(auth)` secara senyap agar siswa secara instan terdaftar sebagai pengguna anonim Firebase. Ini memberi akses tulis yang aman dan valid ke Firestore.
- File: `src/app/cbt/page.tsx`

  ```typescript
  import { signInAnonymously } from "firebase/auth";
  import { auth } from "@/lib/firebase";

  // Di dalam handleStartExam sebelum router.push:
  await signInAnonymously(auth);
  ```

3. **Looping Detak Jantung (Heartbeat Loop)**:
   - Jalankan `setInterval` setiap **30 detik** untuk memicu `pulseStudentExam()`.
   - Begitu status browser terdeteksi `hidden` atau `visible` (perubahan fokus tab), pemicuan status `isIdle` akan otomatis mengirimkan pulse instan dengan status `"IDLE"` atau `"ACTIVE"`.
4. **Pencatatan Kendala Submit & Pemicuan Instan**:
   - Di dalam fungsi `performSubmission`, jika request `fetch("/api/exams/submit")` mengalami kegagalan/error:
     - Tangkap detail pesannya (misal: `"Internet Terputus (Gagal menghubungi server)"` atau pesan error dari server).
     - Set state `submitError` dengan pesan tersebut.
     - Segera panggil `pulseStudentExam("SUBMIT_FAILED")` secara instan agar guru pengawas langsung mendapatkan notifikasi kedipan merah di layar monitornya saat itu juga!
5. **Pembersihan Setelah Sukses Submit**:
   - Jika submit berhasil (`res.ok`), browser siswa akan menghapus dokumen heartbeat miliknya di Firestore menggunakan `deleteDoc` sebelum membersihkan penyimpanan lokal (`localStorage`).
   - Serta mengupdate status menjadi `"COMPLETED"` agar guru tahu siswa bersangkutan telah sukses 100%.

---

### D. Pengembangan Dashboard Live Monitoring Guru (`src/app/dashboard/exams/[id]/monitor/page.tsx`)

Halaman monitor ini akan menggunakan **Realtime Database Listener** (`onSnapshot`) dari Firebase SDK. Keunggulannya adalah **pembaruan instan tanpa jeda polling**, dan **0% beban query ke TiDB Cloud**!

1. **Pengambilan Data Real-time**:
   - Kita menggunakan `collection` dan `onSnapshot` dari `firebase/firestore`.
   - Mendengarkan perubahan pada `/exams/{examId}/students`:
     ```typescript
     useEffect(() => {
       const studentsCol = collection(db, "exams", id, "students");
       const unsubscribe = onSnapshot(studentsCol, (snapshot) => {
         const list: StudentPulse[] = [];
         snapshot.forEach((doc) => {
           const data = doc.data();
           list.push({
             id: doc.id,
             ...data,
             // Konversi timestamp lastActive dari Firestore
             lastActiveDate: data.lastActive?.toDate() || new Date(),
           });
         });
         setStudents(list);
       });
       return () => unsubscribe();
     }, [id]);
     ```
2. **Logika Menentukan Status Offline di Sisi Guru**:
   - Kita akan membandingkan waktu saat ini dengan `lastActiveDate` siswa.
   - Jika selisih waktu `now() - lastActiveDate` lebih besar dari **90 detik**, maka sistem monitor guru secara dinamis akan menandai siswa tersebut sebagai `"OFFLINE"`.
3. **Fitur Tombol "Bantu Submit" oleh Guru (Super Fitur)**:
   - Pada kartu siswa yang berstatus `SUBMIT_FAILED` atau `OFFLINE` (atau status aktif apa saja), Guru memiliki tombol **"Bantu Submit Jawaban"** di layar monitornya.
   - Ketika diklik, browser guru akan memunculkan dialog konfirmasi: _"Apakah Anda yakin ingin membantu men-submit jawaban Budi Santoso secara paksa dari data detak terakhir?"_
   - Jika guru menyetujui, browser guru akan menembak API `/api/exams/submit` menggunakan data jawaban (`answers`), nama (`studentName`), ID (`studentId`), waktu mulai (`startedAt`), durasi (`durationSeconds`), dan token ujian milik siswa tersebut yang dibaca secara real-time dari dokumen Firestore!
   - Begitu API merespons sukses, browser guru akan menghapus dokumen heartbeat siswa tersebut di Firestore dan mengubah statusnya menjadi `COMPLETED` di layar monitor secara real-time! Ini sangat luar biasa menyelamatkan situasi darurat.
4. **Desain Komponen Antarmuka (UI)**:
   - **Widget Statistik Ringkasan**:
     - _Total Siswa Hadir_ (Aktif + Idle + Offline + Kendala)
     - _🟢 Aktif_ (Online & Sedang mengerjakan)
     - _🟡 Idle / Pindah Tab_ (Siswa tidak sedang fokus di layar ujian, didominasi warna kuning)
     - _🔴 Kendala Submit_ (Siswa gagal mengirim jawaban ke server, merah menyala berkedip)
     - _⚪ Offline_ (Siswa terputus dari jaringan/Wi-Fi > 90 detik, abu-abu)
     - _🔵 Selesai_ (Siswa sukses submit lembar jawaban)
   - **Grid Kartu Siswa (Interactive Student Cards)**:
     - Kartu dinamis dengan indikator warna status.
     - **SUBMIT_FAILED (Kendala Submit)**: Merah berkedip dengan teks tebal ⚠️ **GAGAL SUBMIT** dan menampilkan detail penyebab kendalanya secara transparan, misal: _“Penyebab: Internet Terputus”_ atau _“Penyebab: Token ujian ditutup oleh guru”_. Dilengkapi tombol merah menyala: **"Bantu Submit"**.
     - **IDLE**: Kuning dengan peringatan _“Meninggalkan Layar Ujian!”_ beserta jumlah pelanggaran (violation count).
     - **OFFLINE**: Abu-abu dengan keterangan _“Terputus > 90 detik (Cek koneksi komputer siswa)”_. Dilengkapi tombol abu-abu: **"Bantu Submit Jawaban Terakhir"** (jika siswa terpaksa pulang karena sakit atau laptopnya mati mendadak, guru bisa mengamankan jawaban yang sudah dikerjakannya!).
     - **COMPLETED**: Biru dengan centang hijau tebal _“Jawaban Sukses Tersimpan”_.
5. **Fitur Filter & Pencarian Cepat**:
   - Input pencarian berdasarkan Nama Siswa.
   - Filter cepat berdasarkan kategori status (misal: "Tampilkan hanya yang mengalami Kendala" atau "Tampilkan hanya yang Idle").

---

### E. Tombol Navigasi Monitor Live di Dashboard Guru (`src/app/dashboard/exams/page.tsx`)

- Kita akan menambahkan sebuah tombol aksi baru pada kartu ujian (`ExamCard`) atau daftar aksi ujian di dashboard guru berupa icon monitor (`Tv` atau `Activity`) berlabel **"Pantau Ujian (Live)"** yang akan mengarahkan guru ke halaman `/dashboard/exams/[id]/monitor`.

---

## 4. EDGE CASES & ERROR HANDLING (Kasus Batas & Penanganan Error)

1. **Browser Siswa Crash / Tab Ditutup Tanpa Submit**:
   - Firebase Realtime Database / Firestore akan membiarkan data terakhir tersimpan. Di layar guru, sisa waktu aktif akan terhenti, dan setelah 90 detik status siswa tersebut akan otomatis berganti ke `"OFFLINE"` karena tidak mengirimkan pulse lagi.
2. **Koneksi Siswa Putus-Nyambung (Jaringan Tidak Stabil)**:
   - SDK Firebase Firestore memiliki mekanisme antrean dan pengiriman ulang otomatis bawaan yang sangat tangguh di latar belakang. Guru akan melihat status siswa berubah dari `ACTIVE` 🟢 -> `OFFLINE` ⚪ -> `ACTIVE` 🟢 secara otomatis tanpa intervensi manual.
3. **Siswa Menyelesaikan Ujian dalam Keadaan Benar-benar Offline**:
   - Siswa menekan selesai saat Wi-Fi mati. Request submit Next.js gagal. Browser siswa merekam detail error tersebut ke state `submitError` dan menyimpan status `"SUBMIT_FAILED"`.
   - Begitu koneksi internet tersambung kembali sebentar saja, Pulse langsung terkirim ke Firestore dan guru langsung melihat di layarnya: **"Budi - Gagal Submit (Kendala: Internet Terputus)"**. Guru bisa mendatangi Budi dan memeriksa koneksi komputernya.

---

## 5. SUCCESS CRITERIA (Kriteria Keberhasilan)

1. Menambahkan impor Firestore `db` ke dalam `src/lib/firebase.ts`.
2. Browser siswa berhasil memancarkan Pulse (detak jantung) langsung ke Firestore setiap 30 detik tanpa membebani server Next.js dan database TiDB (0 query tambahan).
3. Status `IDLE` terkirim real-time jika siswa meninggalkan fullscreen atau berpindah tab.
4. Jika terjadi kegagalan submit ujian di browser siswa, detail error submit ditangkap dan dikirimkan secara instan ke Firestore dengan status `SUBMIT_FAILED`.
5. Halaman `/dashboard/exams/[id]/monitor` menampilkan visualisasi live pemantauan seluruh siswa se-kelas secara instan menggunakan realtime database listener (`onSnapshot`) Firebase.
6. Record heartbeat terhapus atau terupdate sukses begitu lembar jawaban tersimpan permanen di database TiDB.
7. Aplikasi Next.js sukses di-build tanpa kesalahan typechecking atau linting.

---

## 🛑 USER REVIEW & APPROVAL (PAUSE POINT)

Sesuai dengan ketentuan workflow pengembangan, tindakan otomatis sekarang dihentikan untuk menunggu ulasan Anda.

✅ Planning file updated at `planning/cbt-live-monitoring.md` using the new Firestore architecture. Please review it. Shall I execute this plan, or do we need to revise it?
