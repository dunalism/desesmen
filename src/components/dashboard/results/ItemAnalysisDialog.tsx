import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { CheckCircle, XCircle, User, AlertCircle } from "lucide-react";
import { ItemAnalysisItem, ExamAttemptItem } from "./types";
import { Badge } from "@/components/ui/badge";

interface ItemAnalysisDialogProps {
  selectedAnalysisItem: ItemAnalysisItem | null;
  attempts: ExamAttemptItem[];
  onClose: () => void;
}

export function ItemAnalysisDialog({
  selectedAnalysisItem,
  attempts,
  onClose,
}: ItemAnalysisDialogProps) {
  const questionId = selectedAnalysisItem?.questionId || null;

  const [prevQuestionId, setPrevQuestionId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"correct" | "incorrect">(
    "incorrect",
  );

  // Reset tab ke "incorrect" ketika soal berganti tanpa useEffect
  if (questionId !== prevQuestionId) {
    setPrevQuestionId(questionId);
    setActiveTab("incorrect");
  }

  const correctStudents: Array<{
    name: string;
    studentId: string | null;
  }> = [];

  const incorrectStudents: Array<{
    name: string;
    studentId: string | null;
    answerText: string;
  }> = [];

  if (selectedAnalysisItem && questionId) {
    attempts.forEach((attempt) => {
      const studentAnswer = attempt.answers.find(
        (ans) => ans.questionId === questionId,
      );
      if (studentAnswer) {
        if (studentAnswer.isCorrect === true) {
          correctStudents.push({
            name: attempt.studentName,
            studentId: attempt.studentId,
          });
        } else if (studentAnswer.isCorrect === false) {
          // Cari detail isi jawaban salah
          let answerText = "";
          if (selectedAnalysisItem.type === "MULTIPLE_CHOICE") {
            const chosenOpt = selectedAnalysisItem.options?.find(
              (o) => o.id === studentAnswer.chosenOptionId,
            );
            answerText = chosenOpt
              ? chosenOpt.optionText
              : studentAnswer.textAnswer || "(Tidak Menjawab / Kosong)";
          } else {
            answerText =
              studentAnswer.textAnswer || "(Tidak Menjawab / Kosong)";
          }

          incorrectStudents.push({
            name: attempt.studentName,
            studentId: attempt.studentId,
            answerText,
          });
        }
      }
    });
  }

  return (
    <Dialog
      open={selectedAnalysisItem !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-2xl md:max-w-4xl max-h-[90vh] flex flex-col p-0">
        <div className="p-6 pb-2">
          <DialogHeader>
            <DialogTitle>
              Detail Butir Soal #{selectedAnalysisItem?.order}
            </DialogTitle>
            <DialogDescription>
              Detail informasi pertanyaan, pilihan jawaban, kunci jawaban, dan
              statistik pengerjaan.
            </DialogDescription>
          </DialogHeader>
        </div>

        {selectedAnalysisItem && (
          <div className="flex-1 overflow-y-auto px-6 space-y-4 my-2">
            {/* Question Text */}
            <div className="space-y-1">
              <p className="text-xs font-bold text-muted-foreground uppercase">
                Pertanyaan:
              </p>
              <div
                className="p-4 bg-muted/30 rounded-lg text-sm font-semibold border"
                dangerouslySetInnerHTML={{
                  __html: selectedAnalysisItem.questionText,
                }}
              />
            </div>

            {/* Options / Answer Keys */}
            {selectedAnalysisItem.type === "MULTIPLE_CHOICE" &&
              selectedAnalysisItem.options && (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-muted-foreground uppercase">
                    Kunci Jawaban:
                  </p>

                  <div className="space-y-2">
                    {selectedAnalysisItem.options
                      .filter((opt) => opt.isCorrect)
                      .map((opt) => (
                        <div
                          key={opt.id}
                          className="flex items-start gap-2 p-3 rounded-lg border text-sm bg-emerald-500/5 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-bold"
                        >
                          <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                          <div>{opt.optionText}</div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

            {selectedAnalysisItem.type !== "MULTIPLE_CHOICE" && (
              <div className="bg-emerald-500/5 border border-emerald-500/20 p-4 rounded-lg space-y-1">
                <p className="text-[10px] font-bold uppercase text-emerald-600">
                  Kunci Jawaban:
                </p>
                <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                  {selectedAnalysisItem.answerKey || "(Tidak Ada)"}
                </p>
              </div>
            )}

            {/* Statistics */}
            <div className="grid grid-cols-3 gap-2 bg-muted/40 p-4 rounded-lg text-center">
              <div>
                <p className="text-[10px] font-bold uppercase text-muted-foreground">
                  Total Menjawab
                </p>
                <p className="text-lg font-black">
                  {selectedAnalysisItem.totalCount}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase text-muted-foreground">
                  Salah
                </p>
                <p className="text-lg font-black text-rose-500">
                  {selectedAnalysisItem.wrongCount}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase text-muted-foreground">
                  Tingkat Kesalahan
                </p>
                <p
                  className={`text-lg font-black ${
                    selectedAnalysisItem.errorPercentage >= 70
                      ? "text-destructive"
                      : "text-primary"
                  }`}
                >
                  {selectedAnalysisItem.errorPercentage}%
                </p>
              </div>
            </div>

            {/* Student List with Correct/Incorrect Breakdown */}
            <div className="border rounded-lg overflow-hidden bg-background">
              {/* Tab Header */}
              <div className="flex border-b bg-muted/20">
                <button
                  type="button"
                  onClick={() => setActiveTab("incorrect")}
                  className={`flex-1 py-2.5 text-xs font-bold transition-all border-b-2 flex items-center justify-center gap-1.5 ${
                    activeTab === "incorrect"
                      ? "border-rose-500 text-rose-600 bg-rose-500/[0.02]"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <XCircle className="h-4 w-4 text-rose-500" />
                  Menjawab Salah ({incorrectStudents.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("correct")}
                  className={`flex-1 py-2.5 text-xs font-bold transition-all border-b-2 flex items-center justify-center gap-1.5 ${
                    activeTab === "correct"
                      ? "border-emerald-500 text-emerald-600 bg-emerald-500/[0.02]"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                  Menjawab Benar ({correctStudents.length})
                </button>
              </div>

              {/* Tab Content */}
              <div className="p-3 max-h-[220px] overflow-y-auto divide-y divide-border">
                {activeTab === "incorrect" && (
                  <>
                    {incorrectStudents.length === 0 ? (
                      <div className="text-center py-6 text-xs text-muted-foreground flex flex-col items-center justify-center gap-1">
                        <AlertCircle className="h-5 w-5 text-muted-foreground/60" />
                        Tidak ada siswa yang menjawab salah.
                      </div>
                    ) : (
                      incorrectStudents.map((student, idx) => (
                        <div
                          key={student.studentId || idx}
                          className="py-2.5 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-rose-100 dark:bg-rose-950/40 flex items-center justify-center text-rose-600 shrink-0">
                              <User className="h-3.5 w-3.5" />
                            </div>
                            <div>
                              <p className="font-bold">{student.name}</p>
                              {student.studentId && (
                                <p className="text-[10px] text-muted-foreground">
                                  ID/NISN: {student.studentId}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="sm:text-right max-w-[70%] sm:max-w-[50%] self-start sm:self-center">
                            <span className="text-[10px] font-bold text-muted-foreground block uppercase mb-0.5">
                              Jawaban Siswa:
                            </span>
                            <Badge
                              variant="outline"
                              className="bg-rose-500/5 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-900/50 text-[11px] py-0.5 px-2 font-semibold text-left block sm:inline-block leading-tight"
                            >
                              {student.answerText}
                            </Badge>
                          </div>
                        </div>
                      ))
                    )}
                  </>
                )}

                {activeTab === "correct" && (
                  <>
                    {correctStudents.length === 0 ? (
                      <div className="text-center py-6 text-xs text-muted-foreground flex flex-col items-center justify-center gap-1">
                        <AlertCircle className="h-5 w-5 text-muted-foreground/60" />
                        Tidak ada siswa yang menjawab benar.
                      </div>
                    ) : (
                      correctStudents.map((student, idx) => (
                        <div
                          key={student.studentId || idx}
                          className="py-2.5 flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 shrink-0">
                              <User className="h-3.5 w-3.5" />
                            </div>
                            <div>
                              <p className="font-bold">{student.name}</p>
                              {student.studentId && (
                                <p className="text-[10px] text-muted-foreground">
                                  ID/NISN: {student.studentId}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/20 text-[10px]">
                            <CheckCircle className="h-3 w-3" /> Benar
                          </div>
                        </div>
                      ))
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="p-6 pt-2 border-t">
          <DialogFooter>
            <Button
              onClick={onClose}
              variant="outline"
              className="w-full sm:w-auto"
            >
              Tutup
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
