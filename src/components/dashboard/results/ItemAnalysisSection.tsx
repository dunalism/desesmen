import { Card } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import { ItemAnalysisItem } from "./types";

interface ItemAnalysisSectionProps {
  itemAnalysis: ItemAnalysisItem[];
  onSelectCard: (item: ItemAnalysisItem) => void;
}

export function ItemAnalysisSection({
  itemAnalysis,
  onSelectCard,
}: ItemAnalysisSectionProps) {
  // Helper menghilangkan HTML Tag untuk analisis butir soal
  const stripHtml = (html: string) => {
    if (!html) return "";
    return html.replace(/<[^>]*>/g, "");
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-xl font-bold tracking-tight">
          Analisis Butir Soal (Item Analysis)
        </h2>
        <p className="text-xs text-muted-foreground">
          Mendeteksi tingkat kesulitan soal secara riil berdasarkan persentase
          kesalahan siswa. Klik kartu soal untuk melihat detail soal dan kunci
          jawaban.
        </p>
      </div>

      {itemAnalysis.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Belum ada data analisis butir soal.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {itemAnalysis.map((item) => {
            const isHighError = item.errorPercentage >= 70;
            return (
              <Card
                key={item.questionId}
                className={`p-4 flex flex-col justify-between border transition-all cursor-pointer hover:shadow-md ${
                  isHighError
                    ? "border-destructive/50 bg-destructive/5 hover:border-destructive"
                    : "hover:border-primary/30"
                }`}
                onClick={() => onSelectCard(item)}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-muted-foreground uppercase">
                      Soal #{item.order}
                    </span>
                    {isHighError && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-destructive">
                        <AlertTriangle className="h-3.5 w-3.5 animate-pulse" />{" "}
                        SULIT
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-medium text-foreground line-clamp-3">
                    {stripHtml(item.questionText) || "Soal tanpa teks"}
                  </p>
                </div>
                <div className="pt-4 border-t mt-3 flex items-center justify-between">
                  <p className="text-[10px] text-muted-foreground">
                    Tingkat Kesalahan Siswa:
                  </p>
                  <p
                    className={`text-sm font-black ${
                      isHighError ? "text-destructive" : "text-muted-foreground"
                    }`}
                  >
                    {item.errorPercentage}%
                  </p>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
