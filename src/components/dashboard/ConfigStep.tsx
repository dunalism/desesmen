"use client";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Sparkles, Settings2 } from "lucide-react";

interface ConfigStepProps {
  questionType: string;
  setQuestionType: (type: string) => void;
  questionCount: number;
  setQuestionCount: (count: number) => void;
  difficulty: string;
  setDifficulty: (diff: string) => void;
  title: string;
  setTitle: (val: string) => void;
  optionsCount: number;
  setOptionsCount: (count: number) => void;
  onBack: () => void;
  onGenerate: () => void;
  mixedMcCount: number;
  setMixedMcCount: (count: number) => void;
  mixedTfCount: number;
  setMixedTfCount: (count: number) => void;
  mixedSaCount: number;
  setMixedSaCount: (count: number) => void;
  mixedMatchCount: number;
  setMixedMatchCount: (count: number) => void;
  autoDistribute: () => void;
  isManualMode?: boolean;
}

export function ConfigStep({
  questionType,
  setQuestionType,
  questionCount,
  setQuestionCount,
  difficulty,
  setDifficulty,
  title,
  setTitle,
  optionsCount,
  setOptionsCount,
  onBack,
  onGenerate,
  mixedMcCount,
  setMixedMcCount,
  mixedTfCount,
  setMixedTfCount,
  mixedSaCount,
  setMixedSaCount,
  mixedMatchCount,
  setMixedMatchCount,
  autoDistribute,
  isManualMode = false,
}: ConfigStepProps) {
  const totalDistributed =
    mixedMcCount + mixedTfCount + mixedSaCount + mixedMatchCount;
  const isBalanced = totalDistributed === questionCount;

  return (
    <Card>
      <CardHeader className="space-y-1.5 pb-6">
        <CardTitle className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Settings2 className="h-6 w-6 text-primary animate-spin-slow" />
          Tahap 2: Konfigurasi Parameter Asesmen
        </CardTitle>
        <CardDescription>
          Atur parameter soal yang ingin dibuat agar sesuai dengan kebutuhan dan
          level siswa Anda.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Nama Paket Soal */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-foreground block">
            Nama Paket Soal (Judul Asesmen)
          </label>
          <Input
            type="text"
            placeholder="Contoh: Penilaian Harian Fisika Bab 2 Gaya dan Energi"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="h-10 font-medium"
          />
        </div>

        {/* Tipe Soal */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-foreground block">
            Tipe Soal
          </label>
          <Select value={questionType} onValueChange={setQuestionType}>
            <SelectTrigger className="w-full h-10">
              <SelectValue placeholder="Pilih Tipe Soal" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="MULTIPLE_CHOICE">
                Pilihan Ganda (Multiple Choice)
              </SelectItem>
              <SelectItem value="TRUE_FALSE">
                Benar/Salah (True or False)
              </SelectItem>
              <SelectItem value="SHORT_ANSWER">
                Uraian/Esai (Short Answer)
              </SelectItem>
              <SelectItem value="MATCHING">Menjodohkan (Matching)</SelectItem>
              <SelectItem value="MIXED">Campuran (Mixed Assessment)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Jumlah Pilihan Jawaban - Hanya muncul untuk Pilihan Ganda, & Campuran jika PG > 0 */}
        {(questionType === "MULTIPLE_CHOICE" ||
          (questionType === "MIXED" && mixedMcCount > 0)) && (
          <div className="space-y-2 animate-fade-in">
            <label className="text-sm font-semibold text-foreground block">
              Jumlah Pilihan Jawaban (Khusus Pilihan Ganda)
            </label>
            <div className="flex gap-4">
              {[4, 5].map((num) => (
                <Button
                  key={num}
                  type="button"
                  onClick={() => setOptionsCount(num)}
                  variant={optionsCount === num ? "default" : "outline"}
                  className="flex-1 h-10 font-medium"
                >
                  {num} Pilihan (A-{num === 4 ? "D" : "E"})
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Jumlah Soal - Hanya ditampilkan jika bukan mode manual */}
        {!isManualMode && (
          <div className="space-y-2 animate-fade-in">
            <label className="text-sm font-semibold text-foreground block">
              Jumlah Soal
            </label>
            <div className="grid grid-cols-4 gap-4">
              {[10, 20, 50].map((num) => (
                <Button
                  key={num}
                  type="button"
                  onClick={() => setQuestionCount(num)}
                  variant={questionCount === num ? "default" : "outline"}
                  className="h-10 font-medium"
                >
                  {num} Soal
                </Button>
              ))}
              <div className="relative col-span-1">
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={questionCount}
                  onChange={(e) => setQuestionCount(Number(e.target.value))}
                  className="h-10 text-center pr-2 font-medium"
                  placeholder="Lainnya"
                />
              </div>
            </div>
          </div>
        )}

        {/* Distribusi Campuran (Hanya muncul jika Tipe Soal === MIXED dan bukan mode manual) */}
        {!isManualMode && questionType === "MIXED" && (
          <div className="space-y-4 p-4 border rounded-lg bg-muted/20 animate-fade-in">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="text-sm font-bold text-foreground">
                  Distribusi Soal Campuran
                </h4>
                <p className="text-xs text-muted-foreground">
                  Tentukan jumlah soal untuk setiap jenis pertanyaan.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={autoDistribute}
                className="h-8 text-xs font-semibold gap-1.5"
              >
                <Sparkles className="h-3 w-3 text-yellow-500 animate-pulse" />
                Bagi Rata
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Pilihan Ganda */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">
                  Pilihan Ganda
                </label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 text-sm"
                    disabled={mixedMcCount <= 0}
                    onClick={() =>
                      setMixedMcCount(Math.max(0, mixedMcCount - 1))
                    }
                  >
                    -
                  </Button>
                  <Input
                    type="number"
                    min={0}
                    value={mixedMcCount}
                    onChange={(e) => {
                      const v = Math.max(0, parseInt(e.target.value) || 0);
                      setMixedMcCount(v);
                    }}
                    className="h-8 text-center text-xs font-bold"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 text-sm"
                    onClick={() => setMixedMcCount(mixedMcCount + 1)}
                  >
                    +
                  </Button>
                </div>
              </div>

              {/* Benar/Salah */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">
                  Benar/Salah
                </label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 text-sm"
                    disabled={mixedTfCount <= 0}
                    onClick={() =>
                      setMixedTfCount(Math.max(0, mixedTfCount - 1))
                    }
                  >
                    -
                  </Button>
                  <Input
                    type="number"
                    min={0}
                    value={mixedTfCount}
                    onChange={(e) => {
                      const v = Math.max(0, parseInt(e.target.value) || 0);
                      setMixedTfCount(v);
                    }}
                    className="h-8 text-center text-xs font-bold"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 text-sm"
                    onClick={() => setMixedTfCount(mixedTfCount + 1)}
                  >
                    +
                  </Button>
                </div>
              </div>

              {/* Menjodohkan */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">
                  Menjodohkan
                </label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 text-sm"
                    disabled={mixedMatchCount <= 0}
                    onClick={() =>
                      setMixedMatchCount(Math.max(0, mixedMatchCount - 1))
                    }
                  >
                    -
                  </Button>
                  <Input
                    type="number"
                    min={0}
                    value={mixedMatchCount}
                    onChange={(e) => {
                      const v = Math.max(0, parseInt(e.target.value) || 0);
                      setMixedMatchCount(v);
                    }}
                    className="h-8 text-center text-xs font-bold"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 text-sm"
                    onClick={() => setMixedMatchCount(mixedMatchCount + 1)}
                  >
                    +
                  </Button>
                </div>
              </div>

              {/* Uraian */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">
                  Uraian/Esai
                </label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 text-sm"
                    disabled={mixedSaCount <= 0}
                    onClick={() =>
                      setMixedSaCount(Math.max(0, mixedSaCount - 1))
                    }
                  >
                    -
                  </Button>
                  <Input
                    type="number"
                    min={0}
                    value={mixedSaCount}
                    onChange={(e) => {
                      const v = Math.max(0, parseInt(e.target.value) || 0);
                      setMixedSaCount(v);
                    }}
                    className="h-8 text-center text-xs font-bold"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 text-sm"
                    onClick={() => setMixedSaCount(mixedSaCount + 1)}
                  >
                    +
                  </Button>
                </div>
              </div>
            </div>

            {/* Indikator Status Jumlah */}
            <div className="text-xs mt-2 font-medium flex items-center justify-between p-2 rounded bg-muted/40">
              <span>
                Total Terdistribusi:{" "}
                <strong
                  className={
                    isBalanced
                      ? "text-emerald-600 font-bold"
                      : "text-destructive font-bold"
                  }
                >
                  {totalDistributed}
                </strong>{" "}
                dari{" "}
                <strong className="text-foreground">{questionCount}</strong>
              </span>
              {isBalanced ? (
                <span className="text-emerald-600 font-bold flex items-center gap-1">
                  ✓ Distribusi Pas
                </span>
              ) : (
                <span className="text-destructive font-bold flex items-center gap-1 animate-pulse">
                  ⚠ Selisih {Math.abs(questionCount - totalDistributed)}{" "}
                  {totalDistributed > questionCount ? "Kelebihan" : "Kurang"}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Tingkat Kesulitan */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-foreground block">
            Tingkat Kesulitan
          </label>
          <Select value={difficulty} onValueChange={setDifficulty}>
            <SelectTrigger className="w-full h-10">
              <SelectValue placeholder="Pilih Tingkat Kesulitan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="EASY">Mudah (EASY)</SelectItem>
              <SelectItem value="MEDIUM">Sedang (MEDIUM)</SelectItem>
              <SelectItem value="HARD">Sulit (HARD)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>

      <CardFooter className="flex items-center justify-between border-t border-border pt-6 pb-6 bg-muted/10">
        <Button
          onClick={onBack}
          variant="outline"
          className="h-11 px-5 flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Kembali</span>
        </Button>

        <Button
          onClick={onGenerate}
          disabled={!isManualMode && questionType === "MIXED" && !isBalanced}
          className="h-11 px-6 font-bold flex items-center gap-2 shadow-md bg-gradient-to-r from-primary to-primary/80 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none"
        >
          <Sparkles className="h-4 w-4 text-yellow-400 animate-pulse" />
          <span>
            {isManualMode ? "Buat Paket Ujian Manual" : "Buat Soal Sekarang"}
          </span>
        </Button>
      </CardFooter>
    </Card>
  );
}
