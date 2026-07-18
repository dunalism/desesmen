import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { CheckCircle, XCircle } from "lucide-react";
import { useDialog } from "@/components/ui/dialog-provider";
import { ExamAttemptItem, StudentAnswerItem } from "./types";

interface EssayGradingDialogProps {
  selectedAttempt: ExamAttemptItem | null;
  onClose: () => void;
  examId: string;
  onGradeSuccess: (updatedAttempt: ExamAttemptItem) => void;
}

export function EssayGradingDialog({
  selectedAttempt,
  onClose,
  examId,
  onGradeSuccess,
}: EssayGradingDialogProps) {
  const { showAlert } = useDialog();
  const [gradingQuestion, setGradingQuestion] =
    useState<StudentAnswerItem | null>(null);
  const [essayScore, setEssayScore] = useState<number>(100);
  const [isGradingLoading, setIsGradingLoading] = useState(false);

  const stripHtml = (html: string) => {
    if (!html) return "";
    return html.replace(/<[^>]*>/g, "");
  };

  const handleSaveEssayGrade = async () => {
    if (!selectedAttempt || !gradingQuestion) return;

    setIsGradingLoading(true);
    try {
      const response = await fetch(`/api/exams/${examId}/score-essay`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attemptId: selectedAttempt.id,
          questionId: gradingQuestion.questionId,
          scoreEssay: essayScore,
        }),
      });

      if (response.ok) {
        showAlert("Sukses", "Nilai esai berhasil disimpan!");

        // Ambil data hasil terbaru untuk attempt ini agar dialog diperbarui
        const updatedResponse = await fetch(`/api/exams/${examId}/results`);
        if (updatedResponse.ok) {
          const updatedData = await updatedResponse.json();
          const nextAttempt = updatedData.attempts.find(
            (a: ExamAttemptItem) => a.id === selectedAttempt.id,
          );
          if (nextAttempt) {
            onGradeSuccess(nextAttempt);
          }
        }

        setGradingQuestion(null);
      } else {
        const result = await response.json();
        showAlert("Gagal", result.error || "Gagal menyimpan penilaian esai.");
      }
    } catch (err) {
      console.error(err);
      showAlert("Error", "Terjadi kesalahan jaringan.");
    } finally {
      setIsGradingLoading(false);
    }
  };

  return (
    <Dialog
      open={selectedAttempt !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Koreksi Jawaban Esai Siswa</DialogTitle>
          <DialogDescription>
            Menilai jawaban soal bertipe SHORT_ANSWER (Uraian) untuk siswa{" "}
            <strong>{selectedAttempt?.studentName}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 my-4">
          {selectedAttempt?.answers
            .filter((ans) => ans.questionType === "SHORT_ANSWER")
            .map((ans, idx) => (
              <Card key={ans.id} className="p-4 space-y-4">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-muted-foreground">
                    Pertanyaan #{idx + 1}
                  </p>
                  <p className="text-sm font-semibold">
                    {stripHtml(ans.questionText)}
                  </p>
                </div>

                <div className="bg-muted p-3 rounded-lg space-y-1">
                  <p className="text-[10px] font-bold uppercase text-muted-foreground">
                    Jawaban Siswa:
                  </p>
                  <p className="text-sm italic font-medium">
                    {ans.textAnswer
                      ? `"${ans.textAnswer}"`
                      : "(Tidak Menjawab)"}
                  </p>
                </div>

                <div className="bg-emerald-500/5 border border-emerald-500/20 p-3 rounded-lg space-y-1">
                  <p className="text-[10px] font-bold uppercase text-emerald-500">
                    Kunci Jawaban Guru:
                  </p>
                  <p className="text-sm font-semibold text-emerald-600">
                    {ans.answerKey}
                  </p>
                </div>

                {gradingQuestion?.id === ans.id ? (
                  <div className="bg-muted/40 p-4 rounded-lg space-y-3">
                    <p className="text-xs font-semibold">
                      Tentukan Kebenaran Jawaban:
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        className={`flex-1 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10
                          ${essayScore === 100 && "bg-emerald-500/10!"}
                        `}
                        onClick={() => {
                          setEssayScore(100);
                        }}
                      >
                        <CheckCircle className="mr-1.5 h-4 w-4" /> Benar
                      </Button>
                      <Button
                        variant="secondary"
                        className={`flex-1 text-destructive hover:text-destructive/90 hover:bg-destructive/10
                          ${essayScore === 0 && "bg-destructive/10!"}`}
                        onClick={() => {
                          setEssayScore(0);
                        }}
                      >
                        <XCircle className="mr-1.5 h-4 w-4" /> Salah
                      </Button>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setGradingQuestion(null)}
                      >
                        Batal
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSaveEssayGrade}
                        disabled={isGradingLoading}
                      >
                        {isGradingLoading ? "Menyimpan..." : "Simpan Nilai"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between pt-2 border-t">
                    <p className="text-xs">
                      Status Saat Ini:{" "}
                      {ans.isCorrect === true ? (
                        <span className="text-emerald-500 font-bold">
                          BENAR
                        </span>
                      ) : ans.isCorrect === false ? (
                        <span className="text-destructive font-bold">
                          SALAH
                        </span>
                      ) : (
                        <span className="text-muted-foreground font-semibold">
                          BELUM DIPERIKSA
                        </span>
                      )}
                    </p>
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => {
                        setGradingQuestion(ans);
                        setEssayScore(ans.isCorrect === true ? 100 : 0);
                      }}
                    >
                      Koreksi
                    </Button>
                  </div>
                )}
              </Card>
            ))}
        </div>

        <DialogFooter>
          <Button onClick={onClose} variant="outline">
            Selesai Memeriksa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
