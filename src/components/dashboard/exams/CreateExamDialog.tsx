"use client";

import { useState } from "react";
import { X, Settings, Loader2 } from "lucide-react";
import { useDialog } from "@/components/ui/dialog-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { AssessmentOption } from "@/lib/types";

interface CreateExamDialogProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  assessments: AssessmentOption[];
  onSuccess: (token: string) => void;
}

export function CreateExamDialog({
  isOpen,
  onClose,
  userId,
  assessments,
  onSuccess,
}: CreateExamDialogProps) {
  const { showAlert } = useDialog();

  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [selectedAssessmentId, setSelectedAssessmentId] = useState("");
  const [examTitle, setExamTitle] = useState("");
  const [examDuration, setExamDuration] = useState(60);
  const [startTime, setStartTime] = useState(() => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  });
  const [endTime, setEndTime] = useState(() => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}T${pad(tomorrow.getHours())}:${pad(tomorrow.getMinutes())}`;
  });
  const [showLeaderboard, setShowLeaderboard] = useState(true);
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [shuffleOptions, setShuffleOptions] = useState(false);

  // Handler pembuatan ujian baru
  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedAssessmentId) {
      showAlert("Validasi", "Silakan pilih Paket Soal terlebih dahulu.");
      return;
    }
    if (!examTitle.trim()) {
      showAlert("Validasi", "Judul ujian wajib diisi.");
      return;
    }
    if (examDuration <= 0) {
      showAlert("Validasi", "Durasi pengerjaan harus lebih besar dari 0.");
      return;
    }

    const startVal = new Date(startTime);
    const endVal = new Date(endTime);

    if (startVal >= endVal) {
      showAlert(
        "Validasi",
        "Waktu selesai harus lebih lambat dari waktu mulai.",
      );
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/exams", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          assessmentId: selectedAssessmentId,
          title: examTitle,
          duration: examDuration,
          startTime: startVal.toISOString(),
          endTime: endVal.toISOString(),
          showLeaderboard,
          shuffleQuestions,
          shuffleOptions,
        }),
      });

      const result = await res.json();

      if (res.ok) {
        onSuccess(result.data.token);
      } else {
        showAlert("Gagal", result.error || "Gagal membuat sesi ujian.");
      }
    } catch (error) {
      console.error("Submit error:", error);
      showAlert("Error", "Terjadi kesalahan jaringan.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-fade-in text-foreground">
      <Card className="relative w-full max-w-2xl bg-card border border-border max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            <CardTitle className="text-xl font-bold">Buat Sesi Ujian</CardTitle>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </CardHeader>

        {/* Modal Body / Form */}
        <CardContent className="pt-4">
          <form onSubmit={handleCreateExam} className="space-y-4">
            {/* Dropdown Pilih Paket Soal */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Pilih Paket Soal (Assessment){" "}
                <span className="text-destructive">*</span>
              </label>
              <select
                required
                value={selectedAssessmentId}
                onChange={(e) => {
                  const id = e.target.value;
                  setSelectedAssessmentId(id);
                  if (id) {
                    const selected = assessments.find((a) => a.id === id);
                    if (selected) {
                      const titleName = selected.title || "Ujian Baru";
                      setExamTitle(titleName);
                    }
                  }
                }}
                className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
              >
                <option value="" className="dark:bg-card">
                  -- Pilih Paket Soal --
                </option>
                {assessments.map((a) => (
                  <option key={a.id} value={a.id} className="dark:bg-card">
                    {a.title || "Tanpa Judul"} ({a._count?.questions} Soal -{" "}
                    {a.questionType})
                  </option>
                ))}
              </select>
              {assessments.length === 0 && (
                <p className="mt-1 text-xs text-destructive">
                  Anda belum memiliki Paket Soal. Silakan buat paket soal
                  terlebih dahulu di menu Bank Soal.
                </p>
              )}
            </div>

            {/* Judul Ujian */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Judul Sesi Ujian <span className="text-destructive">*</span>
              </label>
              <Input
                type="text"
                required
                placeholder="Misal: Ujian Harian Matematika Semester Ganjil"
                value={examTitle}
                onChange={(e) => setExamTitle(e.target.value)}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Durasi */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Durasi Pengerjaan (Menit){" "}
                  <span className="text-destructive">*</span>
                </label>
                <Input
                  type="number"
                  required
                  min={1}
                  value={examDuration}
                  onChange={(e) =>
                    setExamDuration(
                      Math.max(1, parseInt(e.target.value, 10) || 0),
                    )
                  }
                />
              </div>

              {/* Toggle Leaderboard */}
              <div className="flex flex-col justify-center rounded-lg bg-muted/50 border p-3.5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold block">
                      Papan Peringkat
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      Tampilkan peringkat publik siswa
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={showLeaderboard}
                    onChange={(e) => setShowLeaderboard(e.target.checked)}
                    className="h-4 w-4 accent-primary rounded cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Batasan Waktu */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Waktu Mulai <span className="text-destructive">*</span>
                </label>
                <Input
                  type="datetime-local"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="text-foreground bg-transparent dark:bg-input/30"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Waktu Selesai <span className="text-destructive">*</span>
                </label>
                <Input
                  type="datetime-local"
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="text-foreground bg-transparent dark:bg-input/30"
                />
              </div>
            </div>

            {/* Fitur Keamanan Pengacakan */}
            <div className="rounded-lg border p-4 space-y-3 bg-muted/20">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                ⚙️ Fitur Pengacakan (Anti Contek)
              </span>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* Acak Soal */}
                <div className="flex items-center justify-between bg-card border rounded-lg p-2.5">
                  <div>
                    <span className="text-xs font-semibold block">
                      Acak Urutan Soal
                    </span>
                    <span className="text-[9px] text-muted-foreground">
                      Urutan butir soal diacak untuk tiap siswa
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={shuffleQuestions}
                    onChange={(e) => setShuffleQuestions(e.target.checked)}
                    className="h-4 w-4 accent-primary rounded cursor-pointer"
                  />
                </div>

                {/* Acak Opsi */}
                <div className="flex items-center justify-between bg-card border rounded-lg p-2.5">
                  <div>
                    <span className="text-xs font-semibold block">
                      Acak Pilihan Jawaban
                    </span>
                    <span className="text-[9px] text-muted-foreground">
                      Pilihan ganda (A/B/C/D) diacak per siswa
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={shuffleOptions}
                    onChange={(e) => setShuffleOptions(e.target.checked)}
                    className="h-4 w-4 accent-primary rounded cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Submit / Cancel Buttons */}
            <div className="mt-6 flex justify-end gap-3 border-t pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Batal
              </Button>
              <Button type="submit" disabled={submitting} variant="default">
                {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Aktifkan Sesi
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
