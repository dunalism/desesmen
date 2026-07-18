"use client";

import { useEffect, useState, use, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useDialog } from "@/components/ui/dialog-provider";
import CbtLayout from "@/components/cbt/CbtLayout";
import CbtTimer from "@/components/cbt/CbtTimer";
import QuestionNavigation from "@/components/cbt/QuestionNavigation";
import {
  RefreshCw,
  Send,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import { Question } from "@/lib/types";
import MatchingSelector from "@/components/cbt/MatchingSelector";

interface ExamData {
  examId: string;
  title: string;
  token: string;
  duration: number;
  startTime: string;
  endTime: string;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  questions: Question[];
}

interface StudentSession {
  name: string;
  studentId: string;
  token: string;
  startedAt: number;
}

interface AnswerState {
  optionId?: string;
  answerText?: string;
  isDoubtful?: boolean;
}

interface CustomWakeLockSentinel {
  release(): Promise<void>;
  released: boolean;
}

// Seeded shuffle to make it persistent on page refresh
function shuffleArrayWithSeed<T>(array: T[], seed: string): T[] {
  const arr = [...array];
  let currentIndex = arr.length,
    temporaryValue,
    randomIndex;

  // Simple seed-based random generator
  let seedNum = 0;
  for (let i = 0; i < seed.length; i++) {
    seedNum += seed.charCodeAt(i);
  }

  const random = () => {
    const x = Math.sin(seedNum++) * 10000;
    return x - Math.floor(x);
  };

  while (0 !== currentIndex) {
    randomIndex = Math.floor(random() * currentIndex);
    currentIndex -= 1;

    temporaryValue = arr[currentIndex];
    arr[currentIndex] = arr[randomIndex];
    arr[randomIndex] = temporaryValue;
  }

  return arr;
}

export default function CbtExamPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const router = useRouter();
  const { token } = use(params);
  const { showAlert, showConfirm } = useDialog();

  const [student, setStudent] = useState<StudentSession | null>(null);
  const [exam, setExam] = useState<ExamData | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({});
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [jitterTime, setJitterTime] = useState<number | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // CBT PROTECTION STATES
  const [isExamStarted, setIsExamStarted] = useState(false);
  const [violationCount, setViolationCount] = useState(0);
  const [violationLog, setViolationLog] = useState<
    { timestamp: string; type: string; reason: string }[]
  >([]);
  const [isOutFullscreen, setIsOutFullscreen] = useState(false);
  const [isFullscreenSupported, setIsFullscreenSupported] = useState(true);

  const wakeLockRef = useRef<CustomWakeLockSentinel | null>(null);

  // Initialize and load data from localStorage
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const doc = document as unknown as Record<string, unknown>;
        const docEl = document.documentElement as unknown as Record<
          string,
          unknown
        >;
        const hasFullscreenSupport = !!(
          document.documentElement.requestFullscreen ||
          typeof docEl.webkitRequestFullscreen === "function" ||
          typeof docEl.mozRequestFullScreen === "function" ||
          typeof docEl.msRequestFullscreen === "function" ||
          document.fullscreenEnabled ||
          typeof doc.webkitFullscreenEnabled === "boolean" ||
          typeof doc.mozFullScreenEnabled === "boolean" ||
          typeof doc.msFullscreenEnabled === "boolean"
        );
        setIsFullscreenSupported(hasFullscreenSupport);

        const savedSession = localStorage.getItem(
          `cbt-student-session-${token}`,
        );
        const savedExam = localStorage.getItem(`cbt-exam-data-${token}`);

        if (!savedSession || !savedExam) {
          router.push("/cbt");
          return;
        }

        const parsedSession: StudentSession = JSON.parse(savedSession);
        const parsedExam: ExamData = JSON.parse(savedExam);

        setStudent(parsedSession);
        setExam(parsedExam);

        // 1. Salin data soal dasar agar tidak merusak data asli di localStorage
        let finalQuestions = parsedExam.questions.map((q) => ({
          ...q,
          options: q.options ? [...q.options] : [], // deep copy opsi
        }));

        // 2. Kunci Identitas untuk Seed Pengacak
        const baseSeed = parsedSession.name + parsedSession.studentId;

        // 3. Eksekusi Pengacakan Opsi Pilihan Ganda (Jika diaktifkan oleh Guru)
        if (parsedExam.shuffleOptions) {
          finalQuestions = finalQuestions.map((q) => {
            if (
              q.type === "MULTIPLE_CHOICE" &&
              q.options &&
              q.options.length > 0
            ) {
              // Gabungkan baseSeed dengan ID Soal agar acakan opsi antar-soal berbeda pola
              const optionSeed = baseSeed + q.id;
              return {
                ...q,
                options: shuffleArrayWithSeed(q.options, optionSeed),
              };
            }
            return q;
          });
        }

        // 4. Eksekusi Pengacakan Nomor Urut Soal (Jika diaktifkan oleh Guru)
        if (parsedExam.shuffleQuestions) {
          finalQuestions = shuffleArrayWithSeed(finalQuestions, baseSeed);
        }

        setQuestions(finalQuestions);

        // Load saved answers, violationCount, violationLog from sessionStorage
        const savedSessionData = sessionStorage.getItem(`cbt-session-${token}`);
        let loadedAnswers: Record<string, AnswerState> = {};

        if (savedSessionData) {
          try {
            const parsed = JSON.parse(savedSessionData);
            if (parsed.answers) {
              loadedAnswers = parsed.answers;
              setAnswers(loadedAnswers);
            }
            if (typeof parsed.violationCount === "number") {
              setViolationCount(parsed.violationCount);
            }
            if (Array.isArray(parsed.violationLog)) {
              setViolationLog(parsed.violationLog);
            }
            if (parsed.isExamStarted) {
              setIsExamStarted(true);
              // Jika sudah mulai lalu refresh, paksa masuk fullscreen kembali (hanya jika didukung)
              if (hasFullscreenSupport) {
                setIsOutFullscreen(true);
              }
            }
          } catch (e) {
            console.error("Error parsing cbt-session:", e);
          }
        }

        // Fallback ke localStorage jika data sessionStorage kosong (agar tidak kehilangan progres lama)
        if (Object.keys(loadedAnswers).length === 0) {
          const savedAnswers = localStorage.getItem(`cbt-answers-${token}`);
          if (savedAnswers) {
            const parsedLocalAnswers = JSON.parse(savedAnswers);
            setAnswers(parsedLocalAnswers);

            // Sinkronisasi ke sessionStorage
            sessionStorage.setItem(
              `cbt-session-${token}`,
              JSON.stringify({
                answers: parsedLocalAnswers,
                violationCount: 0,
                violationLog: [],
                isExamStarted: false,
              }),
            );
          }
        }

        setLoading(false);
      } catch (err) {
        console.error("Error loading CBT data:", err);
        router.push("/cbt");
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [token, router]);

  // Save answers state to sessionStorage on every change
  const saveAnswer = (questionId: string, newState: Partial<AnswerState>) => {
    setAnswers((prev) => {
      const updatedAnswers = {
        ...prev,
        [questionId]: {
          ...prev[questionId],
          ...newState,
        },
      };

      const currentSessionData = sessionStorage.getItem(`cbt-session-${token}`);
      let parsed = {};
      if (currentSessionData) {
        try {
          parsed = JSON.parse(currentSessionData);
        } catch {}
      }

      sessionStorage.setItem(
        `cbt-session-${token}`,
        JSON.stringify({
          ...parsed,
          answers: updatedAnswers,
        }),
      );
      return updatedAnswers;
    });
  };

  const handleToggleDoubtful = (questionId: string) => {
    const currentDoubtful = !!answers[questionId]?.isDoubtful;
    saveAnswer(questionId, { isDoubtful: !currentDoubtful });
  };

  // HELPER UNTUK MEMERIKSA FULLSCREEN
  const checkFullscreen = (): boolean => {
    const doc = document as unknown as Record<string, unknown>;
    return !!(
      document.fullscreenElement ||
      doc.webkitFullscreenElement ||
      doc.mozFullScreenElement ||
      doc.msFullscreenElement
    );
  };

  // MEMULAI UJIAN SECARA AMAN (MASUK FULLSCREEN JIKA DIDUKUNG)
  const handleStartExamSecure = async () => {
    if (!isFullscreenSupported) {
      setIsExamStarted(true);
      setIsOutFullscreen(false);

      const currentSessionData = sessionStorage.getItem(`cbt-session-${token}`);
      let parsed = {};
      if (currentSessionData) {
        try {
          parsed = JSON.parse(currentSessionData);
        } catch {}
      }
      sessionStorage.setItem(
        `cbt-session-${token}`,
        JSON.stringify({
          ...parsed,
          isExamStarted: true,
          answers,
        }),
      );
      return;
    }

    try {
      const element = document.documentElement;
      const el = element as unknown as Record<string, unknown>;
      if (element.requestFullscreen) {
        await element.requestFullscreen();
      } else if (typeof el.webkitRequestFullscreen === "function") {
        await (el.webkitRequestFullscreen as () => Promise<void>)();
      } else if (typeof el.msRequestFullscreen === "function") {
        await (el.msRequestFullscreen as () => Promise<void>)();
      } else {
        throw new Error("Fullscreen API tidak didukung oleh browser Anda.");
      }

      setIsExamStarted(true);
      setIsOutFullscreen(false);

      const currentSessionData = sessionStorage.getItem(`cbt-session-${token}`);
      let parsed = {};
      if (currentSessionData) {
        try {
          parsed = JSON.parse(currentSessionData);
        } catch {}
      }
      sessionStorage.setItem(
        `cbt-session-${token}`,
        JSON.stringify({
          ...parsed,
          isExamStarted: true,
          answers,
        }),
      );
    } catch (err) {
      console.error("Fullscreen request failed:", err);
      showAlert(
        "Browser Menolak Fullscreen",
        "Gagal masuk ke mode Layar Penuh (Fullscreen). Silakan pastikan Anda memberikan izin fullscreen untuk situs ini atau gunakan browser lain seperti Google Chrome / Microsoft Edge.",
      );
    }
  };

  // MASUK KEMBALI KE MODE FULLSCREEN
  const handleResumeFullscreen = async () => {
    try {
      const element = document.documentElement;
      const el = element as unknown as Record<string, unknown>;
      if (element.requestFullscreen) {
        await element.requestFullscreen();
      } else if (typeof el.webkitRequestFullscreen === "function") {
        await (el.webkitRequestFullscreen as () => Promise<void>)();
      } else if (typeof el.msRequestFullscreen === "function") {
        await (el.msRequestFullscreen as () => Promise<void>)();
      }
      setIsOutFullscreen(false);
    } catch (err) {
      console.error("Failed to resume fullscreen:", err);
      showAlert(
        "Gagal Layar Penuh",
        "Sistem gagal masuk kembali ke mode Layar Penuh. Silakan klik tombol kembali atau hubungi pengawas.",
      );
    }
  };

  // Web Screen Wake Lock API to prevent screen sleep during exam
  const requestWakeLock = useCallback(async () => {
    if (typeof window === "undefined" || !("wakeLock" in navigator)) return;
    try {
      if (wakeLockRef.current && !wakeLockRef.current.released) {
        return; // Already acquired and active
      }
      const nav = navigator as unknown as {
        wakeLock: {
          request(type: "screen"): Promise<CustomWakeLockSentinel>;
        };
      };
      const sentinel = await nav.wakeLock.request("screen");
      wakeLockRef.current = sentinel;
      console.log("CBT Screen Wake Lock active");
    } catch (err) {
      console.warn("Screen Wake Lock request failed:", err);
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
        console.log("CBT Screen Wake Lock released");
      } catch (err) {
        console.error("Screen Wake Lock release failed:", err);
      } finally {
        wakeLockRef.current = null;
      }
    }
  }, []);

  // Manage Screen Wake Lock lifecycle
  useEffect(() => {
    if (!isExamStarted || isSuccess || submitting) {
      releaseWakeLock();
      return;
    }

    // Request on mount / when exam starts
    requestWakeLock();

    // Re-acquire wake lock if page becomes visible again (since OS/browser releases it on tab/app switch)
    const handleWakeLockVisibilityChange = () => {
      if (
        document.visibilityState === "visible" &&
        isExamStarted &&
        !isSuccess &&
        !submitting
      ) {
        requestWakeLock();
      }
    };

    document.addEventListener(
      "visibilitychange",
      handleWakeLockVisibilityChange,
    );

    return () => {
      document.removeEventListener(
        "visibilitychange",
        handleWakeLockVisibilityChange,
      );
      releaseWakeLock();
    };
  }, [isExamStarted, isSuccess, submitting, requestWakeLock, releaseWakeLock]);

  // DAFTARKAN PELANGGARAN
  const registerViolation = useCallback(
    (type: string, reason: string) => {
      if (!isExamStarted || isSuccess || submitting || violationCount >= 4)
        return;

      const nextCount = violationCount + 1;
      setViolationCount(nextCount);

      const newLogEntry = {
        timestamp: new Date().toISOString(),
        type,
        reason,
      };

      const nextLog = [...violationLog, newLogEntry];
      setViolationLog(nextLog);

      const currentSessionData = sessionStorage.getItem(`cbt-session-${token}`);
      let parsed = {};
      if (currentSessionData) {
        try {
          parsed = JSON.parse(currentSessionData);
        } catch {}
      }

      sessionStorage.setItem(
        `cbt-session-${token}`,
        JSON.stringify({
          ...parsed,
          violationCount: nextCount,
          violationLog: nextLog,
        }),
      );

      if (nextCount >= 4) {
        showAlert(
          "Ujian Dihentikan",
          "Anda telah dideteksi meninggalkan halaman ujian atau keluar dari mode layar penuh sebanyak 4 kali. Sesi ujian Anda dihentikan dan jawaban Anda dikirim otomatis.",
        );
      } else {
        showAlert(
          "⚠️ PERINGATAN",
          `Anda telah dideteksi meninggalkan halaman ujian atau keluar dari mode layar penuh.\n\nPelanggaran: ${nextCount} dari 3.\n\nJika pelanggaran terjadi kembali (maksimal 4 kali), ujian akan dikirim secara otomatis.`,
        );
      }
    },
    [
      isExamStarted,
      isSuccess,
      submitting,
      violationCount,
      violationLog,
      token,
      showAlert,
    ],
  );

  // Submitting the Exam
  const performSubmission = useCallback(async () => {
    if (!student || !exam) return;

    setSubmitting(true);
    setSubmitError(null);

    const formattedAnswers = questions.map((q) => {
      const ans = answers[q.id];
      return {
        questionId: q.id,
        chosenOptionId: ans?.optionId || null,
        textAnswer: ans?.answerText || null,
      };
    });

    const payload = {
      studentName: student.name,
      studentId: student.studentId,
      examToken: token,
      answers: formattedAnswers,
      startedAt: new Date(atob(student.startedAt.toString())),
      durationSeconds:
        new Date().getTime() -
        new Date(atob(student.startedAt.toString())).getTime(),
      submittedAt: new Date(),
    };

    // Calculate Jitter (0 to 15 seconds)
    const jitterSeconds = Math.floor(Math.random() * 15);
    setJitterTime(jitterSeconds);

    // Countdown the jitter queue visually
    for (let i = jitterSeconds; i >= 0; i--) {
      setJitterTime(i);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    try {
      const response = await fetch("/api/exams/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const resData = await response.json();

      if (response.status === 409) {
        throw new Error(
          resData.error || "Jawaban Anda sudah tersimpan sebelumnya.",
        );
      }

      if (!response.ok) {
        throw new Error(resData.error || "Gagal menyimpan lembar jawaban.");
      }

      // Exit fullscreen if active
      if (
        document.fullscreenElement ||
        (document as unknown as Record<string, unknown>).webkitFullscreenElement
      ) {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        } else if (
          (document as unknown as Record<string, unknown>).webkitExitFullscreen
        ) {
          (
            (document as unknown as Record<string, unknown>)
              .webkitExitFullscreen as () => void
          )();
        }
      }

      // Success! Clear local storage and session storage for this exam session
      localStorage.removeItem(`cbt-student-session-${token}`);
      localStorage.removeItem(`cbt-exam-data-${token}`);
      localStorage.removeItem(`cbt-timer-${token}`);
      localStorage.removeItem(`cbt-answers-${token}`);
      sessionStorage.removeItem(`cbt-session-${token}`);

      showAlert(
        "Ujian Selesai",
        "Lembar jawaban Anda berhasil dikirim dan disimpan dengan aman. Terima kasih!",
      );
      setIsSuccess(true);

      router.push("/cbt/success");
    } catch (err: unknown) {
      console.error(err);
      const errMsg = err instanceof Error ? err.message : "Terjadi kesalahan.";
      if (errMsg.includes("sudah tersimpan")) {
        showAlert(
          "Sudah Tersimpan",
          "Jawaban Anda untuk ujian/tugas ini sudah tersimpan di server sebelumnya. Anda tidak perlu mengirimkannya lagi.",
        );
        // Clear storages as well on already-submitted error to avoid lock-up
        localStorage.removeItem(`cbt-student-session-${token}`);
        localStorage.removeItem(`cbt-exam-data-${token}`);
        localStorage.removeItem(`cbt-timer-${token}`);
        localStorage.removeItem(`cbt-answers-${token}`);
        sessionStorage.removeItem(`cbt-session-${token}`);

        setIsSuccess(true);
        router.push("/cbt/success");
      } else {
        setSubmitError(
          errMsg ||
            "Gagal terhubung ke server. Lembar jawaban Anda tetap aman disimpan di laptop ini.",
        );
        showAlert(
          "Koneksi Gagal",
          "Sistem tidak dapat terhubung ke server untuk mengirimkan nilai. Lembar jawaban Anda telah di-backup dengan aman di browser ini. Silakan hubungi pengawas atau klik 'Kirim Ulang' setelah koneksi pulih.",
        );
      }
    } finally {
      setSubmitting(false);
      setJitterTime(null);
    }
  }, [student, exam, questions, answers, token, router, showAlert]);

  const handleSubmitClick = () => {
    // Check if there are unanswered questions
    const unansweredCount = questions.filter((q) => {
      const ans = answers[q.id];
      return (
        !ans ||
        (!ans.optionId && (!ans.answerText || ans.answerText.trim() === ""))
      );
    }).length;

    const extraMsg =
      unansweredCount > 0
        ? `Masih ada ${unansweredCount} soal yang belum Anda jawab. `
        : "";

    showConfirm(
      "Selesaikan Ujian?",
      `${extraMsg}Apakah Anda yakin ingin mengakhiri sesi ujian ini? Setelah dikirim, Anda tidak dapat mengubah jawaban lagi.`,
      performSubmission,
    );
  };

  const handleExitAttempt = useCallback(() => {
    showConfirm(
      "Konfirmasi Keluar Sesi",
      "Apakah Anda yakin ingin keluar ke halaman utama? Tenang, lembar progres jawaban Anda tetap aman disimpan di browser ini.",
      () => {
        setIsNavigating(true);
        setTimeout(() => {
          window.location.href = "/cbt";
        }, 50);
      },
    );
  }, [showConfirm]);

  useEffect(() => {
    if (loading) return;
    if (isSuccess) return;
    window.history.pushState(null, "", window.location.href);
    const handlePopState = () => {
      window.history.pushState(null, "", window.location.href);
      setIsNavigating(true);
      handleExitAttempt();
    };
    // Tameng untuk penutupan tab / refresh total (Aturan baku browser)
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isNavigating) return;
      e.preventDefault();
    };

    window.addEventListener("popstate", handlePopState);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [loading, handleExitAttempt, isNavigating, isSuccess]);

  // Trigger Auto Submit ketika Pelanggaran mencapai Batas Maksimum (4)
  useEffect(() => {
    if (violationCount >= 4 && !isSuccess && !submitting && isExamStarted) {
      const triggerAutoSubmit = async () => {
        setSubmitting(true);
        await performSubmission();
      };
      triggerAutoSubmit();
    }
  }, [violationCount, isSuccess, submitting, isExamStarted, performSubmission]);

  // Monitoring Fullscreen
  useEffect(() => {
    if (!isFullscreenSupported) return; // SKIP jika browser tidak mendukung Fullscreen API
    if (!isExamStarted || isSuccess || submitting || violationCount >= 4)
      return;

    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = checkFullscreen();
      if (!isCurrentlyFullscreen) {
        setIsOutFullscreen(true);
        registerViolation(
          "FULLSCREEN_EXIT",
          "Peserta keluar dari mode fullscreen (layar penuh).",
        );
      } else {
        setIsOutFullscreen(false);
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("mozfullscreenchange", handleFullscreenChange);
    document.addEventListener("MSFullscreenChange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener(
        "webkitfullscreenchange",
        handleFullscreenChange,
      );
      document.removeEventListener(
        "mozfullscreenchange",
        handleFullscreenChange,
      );
      document.removeEventListener(
        "MSFullscreenChange",
        handleFullscreenChange,
      );
    };
  }, [
    isExamStarted,
    isSuccess,
    submitting,
    violationCount,
    registerViolation,
    isFullscreenSupported,
  ]);

  // Monitoring Visibility (Page Switch / Minimize)
  useEffect(() => {
    if (!isExamStarted || isSuccess || submitting || violationCount >= 4)
      return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        registerViolation(
          "PAGE_HIDDEN",
          "Peserta meninggalkan halaman ujian (berpindah tab atau minimize browser).",
        );
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isExamStarted, isSuccess, submitting, violationCount, registerViolation]);

  // Keyboard Protection & Context Menu Protection
  useEffect(() => {
    if (!isExamStarted || isSuccess || submitting) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // F12
      if (e.key === "F12") {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
      if (
        e.ctrlKey &&
        e.shiftKey &&
        (e.key === "I" || e.key === "i" || e.key === "J" || e.key === "j")
      ) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      if (e.ctrlKey && (e.key === "U" || e.key === "u")) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    window.addEventListener("keydown", handleKeyDown, true);
    window.addEventListener("contextmenu", handleContextMenu, true);

    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("contextmenu", handleContextMenu, true);
    };
  }, [isExamStarted, isSuccess, submitting]);

  if (loading || !student || !exam) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground mt-2 font-medium">
          Memuat Ujian...
        </p>
      </div>
    );
  }

  // GERBANG MULAI UJIAN (MUST FULLSCREEN)
  if (!isExamStarted) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 px-4 py-12 dark:bg-background select-none">
        <div className="w-full max-w-lg space-y-6">
          <div className="flex flex-col items-center text-center">
            <div className="inline-flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground font-mono font-bold text-2xl shadow-md">
              CBT
            </div>
            <h1 className="mt-4 font-heading text-2xl font-bold tracking-tight">
              Sistem Proteksi CBT Aktif
            </h1>
            <p className="text-sm text-muted-foreground mt-1">{exam.title}</p>
          </div>

          <Card className="border shadow-lg">
            <CardHeader className="bg-destructive/5 border-b py-4">
              <div className="flex items-center gap-2.5 text-destructive font-bold">
                <AlertTriangle className="h-5 w-5 shrink-0 animate-bounce" />
                <span>ATURAN PENTING & INTEGRITAS UJIAN</span>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-5">
              <div className="space-y-3.5 text-sm leading-relaxed text-muted-foreground">
                <p>
                  Sesi ujian ini dilindungi oleh sistem keamanan anti-curang
                  ketat. Harap baca dan patuhi aturan berikut sebelum memulai:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-foreground font-medium text-xs sm:text-sm">
                  <li>
                    Ujian wajib dikerjakan dalam{" "}
                    <span className="text-primary font-bold">
                      Mode Layar Penuh (Fullscreen)
                    </span>
                    .
                  </li>
                  <li>
                    Sistem mendeteksi jika Anda{" "}
                    <span className="text-destructive font-bold">
                      keluar dari fullscreen.
                    </span>
                    .
                  </li>
                  <li>
                    Setiap tindakan keluar atau berpindah layar dicatat sebagai{" "}
                    <span className="text-destructive font-bold">
                      Pelanggaran
                    </span>
                    .
                  </li>
                  <li>
                    Batas toleransi maksimal adalah{" "}
                    <span className="text-destructive font-bold">
                      3 kali pelanggaran
                    </span>
                    . Pada pelanggaran ke-4, lembar jawaban Anda akan{" "}
                    <span className="text-destructive font-bold">
                      dikirim otomatis ke server
                    </span>{" "}
                    dan sesi ujian Anda ditutup.
                  </li>
                </ul>
                <p className="text-[11px] sm:text-xs italic bg-muted p-2.5 rounded-lg border">
                  Catatan: Pastikan tidak ada aplikasi pop-up, notifikasi, atau
                  antivirus yang aktif selama ujian untuk menghindari kehilangan
                  fokus browser tidak sengaja.
                </p>
              </div>

              <div className="pt-4 border-t flex flex-col sm:flex-row gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    window.location.href = "/cbt";
                  }}
                  className="sm:w-1/3 font-semibold h-11"
                >
                  Batal
                </Button>
                <Button
                  onClick={handleStartExamSecure}
                  className="sm:w-2/3 font-semibold h-11"
                >
                  Setuju & Mulai Ujian
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIdx];
  const currentAnswer = answers[currentQuestion.id] || {};

  return (
    <CbtLayout
      title={exam.title}
      studentName={student.name}
      studentId={student.studentId}
      timerComponent={
        <CbtTimer
          durationMinutes={exam.duration + 0.3}
          token={token}
          startedAt={student.startedAt}
          onTimeUp={performSubmission}
        />
      }
    >
      {/* COVER LAYOUT JIKA DI LUAR FULLSCREEN */}
      {isOutFullscreen && (
        <div className="fixed inset-0 bg-background/95 backdrop-blur-md z-50 flex flex-col items-center justify-center p-4 select-none animate-in fade-in duration-200">
          <div className="w-full max-w-md text-center space-y-6 bg-card p-8 rounded-2xl border shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="size-16 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
              <AlertTriangle className="h-8 w-8 animate-pulse" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold tracking-tight text-foreground">
                Layar Penuh Dinonaktifkan
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Anda terdeteksi keluar dari mode layar penuh (fullscreen). Demi
                keamanan, pengerjaan ujian ditangguhkan hingga Anda kembali ke
                mode layar penuh.
              </p>
            </div>

            <div className="bg-destructive/10 border border-destructive/20 text-destructive p-3.5 rounded-xl font-semibold text-sm">
              Pelanggaran saat ini: {violationCount} dari 3 batas toleransi.
            </div>

            <Button
              onClick={handleResumeFullscreen}
              size="lg"
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-base shadow-lg"
            >
              Masuk Kembali ke Fullscreen
            </Button>
          </div>
        </div>
      )}

      {/* JITTERING / LOADING OVERLAY */}
      {jitterTime !== null && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-sm text-center space-y-4">
            <RefreshCw className="h-10 w-10 animate-spin text-primary mx-auto" />
            <h3 className="text-lg font-bold">Mengirim Lembar Jawaban</h3>
            <p className="text-sm text-muted-foreground">
              Sedang mengantre menyimpan lembar jawaban secara aman ke database
              server...
            </p>
            <div className="bg-muted p-3 rounded-lg border text-sm font-mono font-bold text-amber-600 dark:text-amber-400">
              Estimasi tersisa: {jitterTime} detik
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-12 items-start">
        {/* LEFT COLUMN: Question and Options (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {submitError && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 text-destructive text-sm flex gap-3 items-start">
              <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold">Gagal Mengirim Jawaban</p>
                <p className="text-muted-foreground text-xs">{submitError}</p>
                <Button
                  size="xs"
                  variant="destructive"
                  className="mt-2 font-semibold h-7"
                  onClick={performSubmission}
                  disabled={submitting}
                >
                  <Send className="h-3 w-3 mr-1" /> Kirim Ulang Sekarang
                </Button>
              </div>
            </div>
          )}

          <Card className="border shadow-md">
            <CardHeader className="flex flex-row items-center justify-between border-b py-3.5 px-4 bg-muted/20">
              <span className="font-mono font-bold text-sm tracking-wider text-muted-foreground uppercase">
                Pertanyaan {currentIdx + 1} dari {questions.length}
              </span>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="doubtful-checkbox"
                  checked={!!currentAnswer.isDoubtful}
                  onCheckedChange={() =>
                    handleToggleDoubtful(currentQuestion.id)
                  }
                />
                <label
                  htmlFor="doubtful-checkbox"
                  className="text-xs font-bold text-amber-600 dark:text-amber-400 cursor-pointer uppercase select-none"
                >
                  Ragu-ragu
                </label>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Question Text rendering */}
              <div
                className="text-foreground text-base md:text-lg leading-relaxed font-medium prose prose-sm dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{
                  __html: currentQuestion.questionText,
                }}
              />

              {/* Answers Inputs according to Question Type */}
              <div className="pt-4 border-t border-dashed">
                {currentQuestion.type === "MULTIPLE_CHOICE" && (
                  <div className="grid grid-cols-1 gap-3">
                    {currentQuestion.options.map((opt, idx) => {
                      const label = String.fromCharCode(65 + idx); // A, B, C, D...
                      const isSelected = currentAnswer.optionId === opt.id;

                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() =>
                            saveAnswer(currentQuestion.id, { optionId: opt.id })
                          }
                          className={`flex items-center gap-4 text-left border rounded-xl p-3.5 transition-all outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                            isSelected
                              ? "border-primary bg-primary/5 dark:bg-primary/10 ring-1 ring-primary"
                              : "border-border hover:bg-muted/40"
                          }`}
                        >
                          <div
                            className={`size-7 rounded-lg border font-mono font-bold flex items-center justify-center shrink-0 transition-colors ${
                              isSelected
                                ? "bg-primary border-primary text-primary-foreground"
                                : "border-muted-foreground/30 text-muted-foreground"
                            }`}
                          >
                            {label}
                          </div>
                          <span
                            className="text-sm sm:text-base font-semibold prose prose-sm dark:prose-invert max-w-none"
                            dangerouslySetInnerHTML={{ __html: opt.optionText }}
                          />
                        </button>
                      );
                    })}
                  </div>
                )}

                {currentQuestion.type === "TRUE_FALSE" && (
                  <div className="grid grid-cols-2 gap-4">
                    {["Benar", "Salah"].map((val) => {
                      const isSelected = currentAnswer.answerText === val;

                      return (
                        <button
                          key={val}
                          type="button"
                          onClick={() =>
                            saveAnswer(currentQuestion.id, { answerText: val })
                          }
                          className={`py-4 px-6 text-base font-bold border rounded-xl flex items-center justify-center gap-3 transition-all outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                            isSelected
                              ? "border-primary bg-primary/5 dark:bg-primary/10 ring-1 ring-primary text-primary"
                              : "border-border hover:bg-muted/40"
                          }`}
                        >
                          <div
                            className={`size-4.5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                              isSelected
                                ? "border-primary"
                                : "border-muted-foreground/40"
                            }`}
                          >
                            {isSelected && (
                              <div className="size-2 rounded-full bg-primary" />
                            )}
                          </div>
                          <span>{val}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {currentQuestion.type === "SHORT_ANSWER" && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                      Tuliskan Jawaban Esai Anda
                    </label>
                    <Textarea
                      placeholder="Masukkan jawaban lengkap di sini..."
                      value={currentAnswer.answerText || ""}
                      onChange={(e) =>
                        saveAnswer(currentQuestion.id, {
                          answerText: e.target.value,
                        })
                      }
                      className="min-h-32 text-base"
                    />
                  </div>
                )}

                {currentQuestion.type === "MATCHING" && (
                  <MatchingSelector
                    question={currentQuestion}
                    value={currentAnswer.answerText || ""}
                    onChange={(textValue: string) =>
                      saveAnswer(currentQuestion.id, {
                        answerText: textValue,
                      })
                    }
                  />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Navigation Controls */}
          <div className="flex items-center justify-between gap-4">
            <Button
              variant="outline"
              disabled={currentIdx === 0}
              onClick={() => setCurrentIdx((prev) => prev - 1)}
              className="font-semibold h-9"
            >
              <ArrowLeft className="h-4 w-4 mr-1.5" /> Sebelumnya
            </Button>

            {currentIdx < questions.length - 1 ? (
              <Button
                variant="outline"
                onClick={() => setCurrentIdx((prev) => prev + 1)}
                className="font-semibold h-9"
              >
                Selanjutnya <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            ) : (
              <Button
                variant="default"
                onClick={handleSubmitClick}
                className="bg-green-600 hover:bg-green-700 text-white font-bold h-9"
                disabled={submitting}
              >
                <Send className="h-4 w-4 mr-1.5" /> Selesaikan Ujian
              </Button>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Sidebar Question Grid Navigation (4 cols) */}
        <div className="lg:col-span-4">
          <QuestionNavigation
            questions={questions}
            currentQuestionIndex={currentIdx}
            onSelectQuestion={setCurrentIdx}
            answers={answers}
          />
        </div>
      </div>
    </CbtLayout>
  );
}
