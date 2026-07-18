"use client";

import { useState, use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import {
  Loader2,
  AlertTriangle,
  ArrowLeft,
  FileSpreadsheet,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// Import komponen terpisah
import { ExamResultsStats } from "@/components/dashboard/results/ExamResultsStats";
import { ExamResultsTable } from "@/components/dashboard/results/ExamResultsTable";
import { ItemAnalysisSection } from "@/components/dashboard/results/ItemAnalysisSection";
import { ItemAnalysisDialog } from "@/components/dashboard/results/ItemAnalysisDialog";
import { EssayGradingDialog } from "@/components/dashboard/results/EssayGradingDialog";
import {
  ExamAttemptItem,
  ExamResultsResponse,
  ItemAnalysisItem,
} from "@/components/dashboard/results/types";
import { formatDuration } from "@/lib/utils";

export default function ExamResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = use(params);

  const [userId, setUserId] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Modal States
  const [selectedAttempt, setSelectedAttempt] =
    useState<ExamAttemptItem | null>(null);
  const [selectedAnalysisItem, setSelectedAnalysisItem] =
    useState<ItemAnalysisItem | null>(null);

  // Monitor status autentikasi
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUserId(currentUser.uid);
      } else {
        router.push("/login");
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  // Fetch data hasil ujian dengan SWR
  const { data, error, isLoading, mutate } = useSWR<ExamResultsResponse>(
    userId ? `/api/exams/${id}/results` : null,
    fetcher,
  );

  const exam = data?.exam;
  const stats = data?.stats;
  const attempts = data?.attempts || [];
  const itemAnalysis = data?.itemAnalysis || [];

  // Format tanggal display
  const formatDateDisplay = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Format durasi pengerjaan siswa

  // Ekspor CSV murni client-side
  const handleExportCSV = () => {
    if (!attempts.length || !exam) return;

    const headers = [
      "No. Absen/NISN",
      "Nama Siswa",
      "Waktu Mulai",
      "Waktu Selesai",
      "Durasi",
      "Skor Akhir",
      "Status Penilaian",
    ];

    const rows = attempts.map((att: ExamAttemptItem) => [
      att.studentId || "-",
      att.studentName,
      att.startedAt ? formatDateDisplay(att.startedAt) : "-",
      att.submittedAt ? formatDateDisplay(att.submittedAt) : "-",
      formatDuration(att.durationSeconds),
      att.score !== null ? att.score : "Belum Dinilai",
      att.isGraded ? "Sudah Dinilai" : "Belum Dinilai",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row: (string | number)[]) =>
        row.map((val: string | number) => `"${val}"`).join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `Hasil_Ujian_${exam.token}_${new Date().toISOString().split("T")[0]}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handler setelah grading esai sukses
  const handleGradeSuccess = async (updatedAttempt: ExamAttemptItem) => {
    await mutate();
    setSelectedAttempt(updatedAttempt);
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center gap-3 bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm font-medium text-muted-foreground">
          Memuat Hasil Analisis Ujian...
        </p>
      </div>
    );
  }

  if (error || !data?.success) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center gap-2 p-4 text-center bg-background text-foreground">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <h3 className="text-lg font-semibold">Gagal Memuat Hasil</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          Terjadi kesalahan saat memuat analisis ujian ini. Silakan coba
          beberapa saat lagi.
        </p>
        <Button
          onClick={() => router.push("/dashboard/exams")}
          className="mt-4"
        >
          Kembali ke Daftar Sesi
        </Button>
      </div>
    );
  }

  // Cek apakah ujian ini memiliki soal SHORT_ANSWER / Uraian
  const hasEssayQuestions = attempts.some((att: ExamAttemptItem) =>
    att.answers.some((ans) => ans.questionType === "SHORT_ANSWER"),
  );

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 bg-background text-foreground space-y-8">
      {/* HEADER SECTION */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-6">
        <div className="space-y-1">
          <Button
            variant="ghost"
            className="-ml-3 text-muted-foreground hover:text-foreground"
            onClick={() => router.push("/dashboard/exams")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Sesi Ujian
          </Button>
          <h1 className="text-3xl font-extrabold tracking-tight">
            {exam?.title}
          </h1>
          <p className="text-sm text-muted-foreground">
            Paket Soal: <strong>{exam?.assessmentTitle}</strong> | Kode Token:{" "}
            <span className="font-mono font-bold text-primary">
              {exam?.token}
            </span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleExportCSV}
            variant="outline"
            size="lg"
            disabled={attempts.length === 0}
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" /> Ekspor CSV
          </Button>
        </div>
      </div>

      {/* STATS OVERVIEW CARDS */}
      <ExamResultsStats stats={stats} />

      {/* TABLE SECTION */}
      <ExamResultsTable
        attempts={attempts}
        hasEssayQuestions={hasEssayQuestions}
        onPeriksaEsai={setSelectedAttempt}
      />

      {/* ITEM ANALYSIS SECTION */}
      <ItemAnalysisSection
        itemAnalysis={itemAnalysis}
        onSelectCard={setSelectedAnalysisItem}
      />

      {/* DIALOG DETAIL BUTIR SOAL */}
      <ItemAnalysisDialog
        selectedAnalysisItem={selectedAnalysisItem}
        attempts={attempts}
        onClose={() => setSelectedAnalysisItem(null)}
      />

      {/* DIALOG PERIKSA ESAI */}
      <EssayGradingDialog
        selectedAttempt={selectedAttempt}
        examId={id}
        onClose={() => setSelectedAttempt(null)}
        onGradeSuccess={handleGradeSuccess}
      />
    </div>
  );
}
