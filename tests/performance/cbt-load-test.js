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
      vus: TARGET_VUS,
      iterations: 1,
      maxDuration: "10m",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"], // Error rate <1%
    http_req_duration: ["p(95)<2000"], // 95% request selesai <2 detik
  },
};

// Ambil nilai BASE_URL & TOKEN dari environment variable, atau gunakan default
const BASE_URL = __ENV.K6_BASE_URL || "http://localhost:3000";
const EXAM_TOKEN = __ENV.K6_CBT_TOKEN || "MAT-7X2"; // Silakan disesuaikan dengan token aktif Anda

// Firebase Configuration untuk REST API
const FIREBASE_API_KEY =
  __ENV.K6_FIREBASE_API_KEY || "AIzaSyDP_6iC0bVE-r-9MMMtNPKD_Lxb4F5J6ZM";
const FIREBASE_PROJECT_ID = __ENV.K6_FIREBASE_PROJECT_ID || "soalgenerator21";

// =============================================================================
// 2. HELPER FUNCTIONS
// =============================================================================

/**
 * Format timestamp ke ISO String yang didukung Google REST API (.000Z atau .000000000Z)
 */
function getRFC3339Timestamp(date) {
  return date.toISOString();
}

/**
 * Mengubah array answers k6 menjadi struktur typed ArrayValue Firestore REST API
 */
function buildFirestoreAnswersPayload(answers) {
  const values = answers.map((ans) => {
    return {
      mapValue: {
        fields: {
          questionId: { stringValue: ans.questionId },
          chosenOptionId: ans.chosenOptionId
            ? { stringValue: ans.chosenOptionId }
            : { nullValue: null },
          textAnswer: ans.textAnswer
            ? { stringValue: ans.textAnswer }
            : { nullValue: null },
        },
      },
    };
  });
  return { arrayValue: { values: values } };
}

/**
 * Mengirim pulse monitoring ke Firebase Firestore REST API
 */
function sendFirestorePulse(params) {
  const {
    idToken,
    studentName,
    studentId,
    currentProgress,
    totalQuestions,
    status,
    submitError,
    answers,
    startedAt,
    durationSeconds,
  } = params;

  if (!idToken) return false;

  // Nama dokumen gabungan unik di Firestore: [studentId]_[studentName]
  const documentId = encodeURIComponent(`${studentId}_${studentName}`);
  const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/exams/${EXAM_TOKEN}/students/${documentId}?key=${FIREBASE_API_KEY}`;

  // Susun payload JSON Firestore REST API v1 sesuai tipe data
  const payload = JSON.stringify({
    fields: {
      studentName: { stringValue: studentName.trim() },
      studentId: { stringValue: studentId.trim() },
      currentProgress: { integerValue: String(currentProgress) },
      totalQuestions: { integerValue: String(totalQuestions) },
      violationCount: { integerValue: "0" }, // load test diasumsikan 0 pelanggaran
      lastActive: { timestampValue: getRFC3339Timestamp(new Date()) },
      status: { stringValue: status },
      submitError: submitError
        ? { stringValue: submitError }
        : { nullValue: null },
      answers: buildFirestoreAnswersPayload(answers),
      startedAt: { stringValue: startedAt },
      durationSeconds: { integerValue: String(durationSeconds) },
    },
  });

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${idToken}`,
  };

  // Menggunakan PATCH dengan query updateMask agar mirip dengan setDoc merge: true
  // Kita tentukan query parameters untuk field mana saja yang ingin kita update
  const updateMaskQuery = [
    "updateMask.fieldPaths=studentName",
    "updateMask.fieldPaths=studentId",
    "updateMask.fieldPaths=currentProgress",
    "updateMask.fieldPaths=totalQuestions",
    "updateMask.fieldPaths=violationCount",
    "updateMask.fieldPaths=lastActive",
    "updateMask.fieldPaths=status",
    "updateMask.fieldPaths=submitError",
    "updateMask.fieldPaths=answers",
    "updateMask.fieldPaths=startedAt",
    "updateMask.fieldPaths=durationSeconds",
  ].join("&");

  const patchUrl = `${url}&${updateMaskQuery}`;
  const res = http.request("PATCH", patchUrl, payload, { headers });

  return check(res, {
    "Pulse monitoring berhasil dikirim (200)": (r) => r.status === 200,
  });
}

// =============================================================================
// 3. MAIN SCENARIO (Alur Skenario Pengerjaan Siswa)
// =============================================================================
export default function () {
  // --- TAHAP 1: SISWA MENGAKSES GERBANG CBT ---
  const homeRes = http.get(`${BASE_URL}/cbt`);
  check(homeRes, {
    "Halaman login CBT berhasil diakses (200)": (r) => r.status === 200,
  });
  sleep(1.5); // Simulasi membaca halaman & mengisi identitas

  // --- TAHAP 1.5: SIGN IN ANONIM TO FIREBASE ---
  // Siswa melakukan Anonymous Sign-In ke Firebase Auth via REST API
  const authUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`;
  const authPayload = JSON.stringify({ returnSecureToken: true });
  const authHeaders = { "Content-Type": "application/json" };

  const authRes = http.post(authUrl, authPayload, { headers: authHeaders });
  const isAuthSuccess = check(authRes, {
    "Firebase Anonymous Auth berhasil (200)": (r) => r.status === 200,
  });

  let idToken = null;
  if (isAuthSuccess) {
    try {
      const authData = JSON.parse(authRes.body);
      idToken = authData.idToken;
    } catch (e) {
      console.error("Gagal melakukan parsing token Firebase Auth");
    }
  } else {
    console.warn(
      `Firebase Auth Gagal. Status: ${authRes.status}. Body: ${authRes.body}`,
    );
  }

  // --- TAHAP 2: MULAI UJIAN SEKARANG (DOWNLOAD SOAL) ---
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
  const totalQuestions = questions.length;

  // Generate identitas siswa unik berbasis Virtual User (VU) & iterasi k6
  const runTimestamp = Math.floor(Date.now() / 1000)
    .toString()
    .slice(-5);
  const uniqueStudentId = `ID-${runTimestamp}-${__VU}-${__ITER}`;
  const uniqueStudentName = `Siswa-${runTimestamp}-${__VU}-${__ITER}`;
  const startedAtDate = new Date();
  const startedAtIso = startedAtDate.toISOString();

  // --- TAHAP 3: MENGERJAKAN UJIAN SELAMA 5 MENIT (DENGAN PULSE 30 DETIK) ---
  // Kita menahan peserta mengerjakan ujian selama total 5 menit (300 detik).
  // Selama 5 menit tersebut, kita mengirim pulse detak jantung ke Firestore setiap 30 detik (total 10 kali loop).
  // Kita simulasikan siswa mencicil jawaban secara offline dan bertahap terupdate ke Firestore.

  let currentAnswers = [];

  // Kirim Pulse Awal (Status: ACTIVE, Progress: 0)
  if (idToken) {
    sendFirestorePulse({
      idToken,
      studentName: uniqueStudentName,
      studentId: uniqueStudentId,
      currentProgress: 0,
      totalQuestions,
      status: "ACTIVE",
      submitError: null,
      answers: [],
      startedAt: startedAtIso,
      durationSeconds: 0,
    });
  }

  const pulseInterval = 30; // 30 detik
  const totalLoops = 10; // 10 * 30 detik = 300 detik (5 menit)

  for (let i = 1; i <= totalLoops; i++) {
    sleep(pulseInterval);

    // Hitung waktu pengerjaan kumulatif
    const durationSeconds = i * pulseInterval;

    // Simulasikan pengerjaan soal secara bertahap:
    // Pada loop ke-i, siswa telah menjawab kira-kira (i / totalLoops) bagian dari total soal.
    const answeredCount = Math.min(
      totalQuestions,
      Math.floor((i / totalLoops) * totalQuestions),
    );

    // Perbarui lembar jawaban palsu berdasarkan jumlah soal yang telah dijawab saat ini
    currentAnswers = questions.slice(0, answeredCount).map((q) => {
      let chosenOptionId = null;
      let textAnswer = null;

      if (q.type === "MULTIPLE_CHOICE" && q.options && q.options.length > 0) {
        const randomOptionIdx = Math.floor(Math.random() * q.options.length);
        chosenOptionId = q.options[randomOptionIdx].id;
      } else if (q.type === "TRUE_FALSE") {
        textAnswer = Math.random() > 0.5 ? "Benar" : "Salah";
      } else if (q.type === "MATCHING" && q.options && q.options.length > 0) {
        const randomOptionIdx = Math.floor(Math.random() * q.options.length);
        textAnswer = q.options[randomOptionIdx].optionText;
      } else {
        textAnswer = `Jawaban draf simulasi k6 ke-${i}`;
      }

      return {
        questionId: q.id,
        chosenOptionId: chosenOptionId,
        textAnswer: textAnswer,
      };
    });

    // Kirim Pulse berkala ke Firestore REST API
    if (idToken) {
      sendFirestorePulse({
        idToken,
        studentName: uniqueStudentName,
        studentId: uniqueStudentId,
        currentProgress: answeredCount,
        totalQuestions,
        status: "ACTIVE",
        submitError: null,
        answers: currentAnswers,
        startedAt: startedAtIso,
        durationSeconds,
      });
    }
  }

  // --- TAHAP 4: MENYELESAIKAN & SUBMIT JAWABAN (JITTER SECONDS) ---
  const jitterSeconds = Math.floor(Math.random() * 15);
  sleep(jitterSeconds);

  // Total durasi pengerjaan sebelum disubmit
  const finalDurationSeconds = 300 + jitterSeconds;

  const payload = JSON.stringify({
    studentName: uniqueStudentName,
    studentId: uniqueStudentId,
    examToken: EXAM_TOKEN,
    answers: currentAnswers,
    startedAt: startedAtIso,
    durationSeconds: finalDurationSeconds,
    submittedAt: new Date().toISOString(),
  });

  const headers = {
    "Content-Type": "application/json",
  };

  // Kirim data jawaban ke API Submit utama (MySQL / TiDB Cloud)
  const submitUrl = `${BASE_URL}/api/exams/submit`;
  const submitRes = http.post(submitUrl, payload, { headers });

  const isSubmitSuccess = check(submitRes, {
    "Lembar jawaban berhasil disubmit (200)": (r) => r.status === 200,
    "Deteksi anti-double submit atau sukses": (r) =>
      r.status === 200 || r.status === 409,
  });

  // --- TAHAP 4.5: UPDATE FIREBASE STATUS TO COMPLETED ---
  // Kirim pulse final ke Firestore untuk mengubah status menjadi COMPLETED (mirip client-side behavior)
  if (idToken) {
    let finalStatus = "COMPLETED";
    let finalSubmitError = null;

    if (!isSubmitSuccess) {
      finalStatus = "SUBMIT_FAILED";
      finalSubmitError = `k6 Load Test: API Submit mengembalikan status ${submitRes.status}`;
    }

    sendFirestorePulse({
      idToken,
      studentName: uniqueStudentName,
      studentId: uniqueStudentId,
      currentProgress: totalQuestions,
      totalQuestions,
      status: finalStatus,
      submitError: finalSubmitError,
      answers: currentAnswers,
      startedAt: startedAtIso,
      durationSeconds: finalDurationSeconds,
    });
  }

  // --- TAHAP 4.6: HAPUS AKUN ANONIM FIREBASE AUTH ---
  // Untuk menyamakan behavior client-side yang baru, kita hapus akun anonim k6 di akhir test
  if (idToken) {
    const deleteUserUrl = `https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${FIREBASE_API_KEY}`;
    const deletePayload = JSON.stringify({ idToken: idToken });
    const deleteHeaders = { "Content-Type": "application/json" };

    const deleteRes = http.post(deleteUserUrl, deletePayload, { headers: deleteHeaders });
    check(deleteRes, {
      "Pembersihan akun anonymous Firebase berhasil (200)": (r) => r.status === 200,
    });
  }

  // --- TAHAP 5: HALAMAN BERHASIL ---
  sleep(1); // Jeda pemindahan halaman ke sukses
}
