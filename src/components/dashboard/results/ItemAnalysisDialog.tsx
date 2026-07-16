import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { CheckCircle } from "lucide-react";
import { ItemAnalysisItem } from "./types";

interface ItemAnalysisDialogProps {
  selectedAnalysisItem: ItemAnalysisItem | null;
  onClose: () => void;
}

export function ItemAnalysisDialog({
  selectedAnalysisItem,
  onClose,
}: ItemAnalysisDialogProps) {
  return (
    <Dialog
      open={selectedAnalysisItem !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Detail Butir Soal #{selectedAnalysisItem?.order}
          </DialogTitle>
          <DialogDescription>
            Detail informasi pertanyaan, pilihan jawaban, kunci jawaban, dan
            statistik pengerjaan.
          </DialogDescription>
        </DialogHeader>

        {selectedAnalysisItem && (
          <div className="space-y-4 my-4">
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
                  className={`text-lg font-black ${selectedAnalysisItem.errorPercentage >= 70 ? "text-destructive" : "text-primary"}`}
                >
                  {selectedAnalysisItem.errorPercentage}%
                </p>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button onClick={onClose} variant="outline">
            Tutup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
