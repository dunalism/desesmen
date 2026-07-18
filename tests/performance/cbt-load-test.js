import http from "k6/http";
import { check, sleep } from "k6";

// =============================================================================
// 1. CONFIGURATION (Dinamis: Bisa 50, 100, 150, 200, 250, atau 300 VU)
// =============================================================================

// Ambil nilai target VU dari environment variable (Default: 50 VU jika tidak dispesifikasi)
const TARGET_VUS = parseInt(__ENV.K6_VUS || "50", 10);

export const options = {
  scenarios: {
    ujian_cbt: {
      executor: "per-vu-iterations",
      vus: TARGET_VUS, // Jumlah siswa simulasi (Dinamis sesuai pilihan Anda)
      iterations: 1, // Setiap siswa HANYA mengirim/submit persis 1 kali (no looping!)
      maxDuration: "10m", // Batas toleransi durasi total pengujian
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"], // Toleransi kegagalan API harus di bawah 1% (no error 500/504 dkk)
    http_req_duration: ["p(95)<2000"], // 95% dari request kirim harus selesai di bawah 2 detik
  },
};

// Ambil nilai BASE_URL & TOKEN dari environment variable, atau gunakan default
const BASE_URL = __ENV.K6_BASE_URL || "http://localhost:3000";
const EXAM_TOKEN = __ENV.K6_CBT_TOKEN || "MAT-7X2"; // Silakan disesuaikan dengan token aktif Anda

// =============================================================================
// 2. MAIN SCENARIO (Alur Skenario Pengerjaan Siswa)
// =============================================================================
export default function () {
  // --- TAHAP 1: SISWA MENGAKSES GERBANG CBT ---
  // Menyimulasikan siswa membuka halaman beranda CBT
  const homeRes = http.get(`${BASE_URL}/cbt`);
  check(homeRes, {
    "Halaman login CBT berhasil diakses (200)": (r) => r.status === 200,
  });
  sleep(1.5); // Simulasi membaca halaman & mengisi identitas (1.5 detik)

  // --- TAHAP 2: MULAI UJIAN SEKARANG (DOWNLOAD SOAL) ---
  // Siswa menekan tombol masuk, API Next.js dipanggil untuk mengambil soal.
  // API ini dikunci statis (force-static) di Vercel, ditarik dari CDN Cache tanpa sentuh DB.
  const questionsUrl = `${BASE_URL}/api/exams/${EXAM_TOKEN}/questions`;
  const questionsRes = http.get(questionsUrl);

  const isQuestionsLoaded = check(questionsRes, {
    "Paket soal ujian berhasil dimuat": (r) => r.status === 200,
  });

  if (!isQuestionsLoaded) {
    console.error(
      `Gagal memuat soal untuk token ${EXAM_TOKEN}. Status: ${questionsRes.status}. Error: ${questionsRes.body}`,
    );
    sleep(1);
    return;
  }

  // Parse data soal yang diterima secara dinamis
  let examData;
  try {
    examData = JSON.parse(questionsRes.body);
  } catch (e) {
    console.error("Gagal melakukan parsing JSON dari data soal");
    return;
  }

  const questions = examData.questions || [];

  // --- TAHAP 3: SIMULASI MEMBACA & MENJAWAB ---
  // Pada CBT kita, navigasi dan simpan jawaban sepenuhnya berjalan OFFLINE di localStorage.
  // k6 akan menyimulasikan waktu berpikir siswa secara total (bukan per nomor) tanpa request internet.
  // Menyimulasikan siswa menghabiskan waktu membaca soal (acak antara 5 s.d 10 detik untuk load test)
  const thinkTime = Math.floor(Math.random() * 5) + 5;
  sleep(thinkTime);

  // Buat lembar jawaban palsu di sisi klien k6 berdasarkan format soal asli
  const answers = questions.map((q) => {
    let chosenOptionId = null;
    let textAnswer = null;

    if (q.type === "MULTIPLE_CHOICE" && q.options && q.options.length > 0) {
      // Pilih opsi secara acak dari opsi yang tersedia
      const randomOptionIdx = Math.floor(Math.random() * q.options.length);
      chosenOptionId = q.options[randomOptionIdx].id;
    } else if (q.type === "TRUE_FALSE") {
      textAnswer = Math.random() > 0.5 ? "true" : "false";
    } else if (q.type === "MATCHING" && q.options && q.options.length > 0) {
      // Pada MATCHING, textAnswer berisi opsi jawaban teks yang dipilih
      const randomOptionIdx = Math.floor(Math.random() * q.options.length);
      textAnswer = q.options[randomOptionIdx].optionText;
    } else {
      textAnswer = "Ini adalah draf jawaban essay simulasi k6.";
    }

    return {
      questionId: q.id,
      chosenOptionId: chosenOptionId,
      textAnswer: textAnswer,
    };
  });

  // --- TAHAP 4: MENYELESAIKAN & SUBMIT JAWABAN (JITTER SECONDS) ---
  // Aplikasi asli kita memiliki Jitter acak 0 s.d 15 detik sebelum menembak API Submit.
  // Di k6 kita simulasikan penundaan acak ini agar mencerminkan distribusi beban riil.
  const jitterSeconds = Math.floor(Math.random() * 15);
  sleep(jitterSeconds);

  // Generate identitas siswa unik berbasis Virtual User (VU) & iterasi k6 untuk memintas proteksi Anti Double-Submit
  const uniqueStudentId = `ID-${__VU}-${__ITER}`;
  const uniqueStudentName = `Siswa Simulasi ${__VU} No ${__ITER}`;

  const startedAt = new Date();
  startedAt.setMinutes(startedAt.getMinutes() - 30); // Atur waktu mulai 30 menit yang lalu

  const payload = JSON.stringify({
    studentName: uniqueStudentName,
    studentId: uniqueStudentId,
    examToken: EXAM_TOKEN,
    answers: answers,
    startedAt: startedAt.toISOString(),
    durationSeconds: 1800, // 30 menit dalam detik
    submittedAt: new Date().toISOString(),
  });

  const headers = {
    "Content-Type": "application/json",
  };

  // Kirim data jawaban ke API Submit (Satu-satunya request yang menyentuh database TiDB Cloud)
  const submitUrl = `${BASE_URL}/api/exams/submit`;
  const submitRes = http.post(submitUrl, payload, { headers });

  check(submitRes, {
    "Lembar jawaban berhasil disubmit (200)": (r) => r.status === 200,
    "Deteksi anti-double submit atau sukses": (r) =>
      r.status === 200 || r.status === 409,
  });

  // --- TAHAP 5: HALAMAN BERHASIL ---
  sleep(1); // Jeda pemindahan halaman ke sukses
}
