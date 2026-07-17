"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Trash2,
  ChevronRight,
  Search,
  Loader2,
  Square,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart, CartItem } from "@/lib/cart-context";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Question as DetailedQuestion, Assessment } from "@/lib/types";

const stripHtml = (html: string) => {
  return html ? html.replace(/<[^>]*>/g, "") : "";
};

interface AssessmentCardProps {
  assessment: Assessment;
  debouncedSearch: string;
  selectedType?: string;
  onDelete: (id: string) => Promise<void> | void;
}

export function AssessmentCard({
  assessment,
  debouncedSearch,
  selectedType,
  onDelete,
}: AssessmentCardProps) {
  const router = useRouter();
  const { isSelected, toggleQuestion, addQuestionsBulk, removeQuestionsBulk } =
    useCart();

  const [isExpanded, setIsExpanded] = useState(false);
  const [detailedQuestions, setDetailedQuestions] = useState<
    DetailedQuestion[]
  >([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  const filteredQuestions = selectedType
    ? detailedQuestions.filter((q) => q.type === selectedType)
    : detailedQuestions;

  const isAllSelected =
    filteredQuestions.length > 0 &&
    filteredQuestions.every((q) => isSelected(q.id));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      removeQuestionsBulk(filteredQuestions.map((q) => q.id));
    } else {
      const cartItemsToSelect: CartItem[] = filteredQuestions.map((q) => ({
        id: q.id,
        questionText: q.questionText,
        type: q.type as
          | "MULTIPLE_CHOICE"
          | "TRUE_FALSE"
          | "SHORT_ANSWER"
          | "MATCHING",
        options: q.options.map((opt) => ({
          id: opt.id,
          optionText: opt.optionText,
          isCorrect: opt.isCorrect,
        })),
        answerKey: q.answerKey,
        assessmentId: assessment.id,
        assessmentTextSnippet: `Paket ${getTypeLabel(assessment.questionType)}`,
      }));
      addQuestionsBulk(cartItemsToSelect);
    }
  };

  const handleToggleExpand = async () => {
    const nextState = !isExpanded;
    setIsExpanded(nextState);

    if (nextState && detailedQuestions.length === 0) {
      setLoadingQuestions(true);
      try {
        const response = await fetch(`/api/assessments/${assessment.id}`);
        const data = await response.json();
        if (response.ok && data.assessment && data.assessment.questions) {
          setDetailedQuestions(data.assessment.questions);
        }
      } catch (error) {
        console.error("Gagal memuat detail butir soal:", error);
      } finally {
        setLoadingQuestions(false);
      }
    }
  };

  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case "EASY":
        return "Mudah";
      case "MEDIUM":
        return "Sedang";
      case "HARD":
        return "HOTS / Sulit";
      default:
        return difficulty;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "MULTIPLE_CHOICE":
        return "Pilihan Ganda";
      case "TRUE_FALSE":
        return "Benar/Salah";
      case "SHORT_ANSWER":
        return "Uraian/Esai";
      case "MIXED":
        return "Campuran";
      default:
        return type;
    }
  };

  const dateStr = new Date(assessment.createdAt).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const cleanText =
    assessment.rawInputText?.replace(/[\r\n]+/g, " ").trim() || "";
  const textSnippet =
    assessment.title ||
    (cleanText.length > 70
      ? `${cleanText.substring(0, 70)}...`
      : cleanText || "Materi Pelajaran");

  return (
    <Card className="flex flex-col h-full hover:shadow-md transition-shadow">
      <CardHeader className="pb-3 flex-1">
        <div className="flex items-start justify-between gap-2 mb-2">
          <span className="bg-primary/10 text-primary px-2.5 py-0.5 rounded-full text-[11px] font-semibold">
            {getTypeLabel(assessment.questionType)}
          </span>
          <span className="text-muted-foreground text-xs flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {dateStr}
          </span>
        </div>
        <CardTitle className="text-base line-clamp-2 leading-snug">
          {textSnippet}
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-3 space-y-3">
        <div className="bg-muted/40 rounded-lg p-3 space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tingkat Kesulitan:</span>
            <span className="font-semibold">
              {getDifficultyLabel(assessment.difficulty)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Jumlah Butir Soal:</span>
            <span className="font-semibold">
              {assessment._count?.questions || assessment.questionCount} Soal
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Metode Input:</span>
            <span className="font-semibold">
              {assessment.inputType === "IMAGE"
                ? "Gambar / OCR"
                : "Salin & Tempel"}
            </span>
          </div>
        </div>

        {/* Matching questions snippet box (Hybrid Search View) */}
        {assessment.questions &&
          assessment.questions.length > 0 &&
          !isExpanded && (
            <div className="bg-primary/[0.03] border border-primary/10 rounded-lg p-3 text-xs space-y-2 animate-fade-in">
              <p className="font-semibold text-primary flex items-center gap-1">
                <Search className="h-3.5 w-3.5" />
                Soal yang mengandung &quot;{debouncedSearch}&quot;:
              </p>
              <ul className="list-disc list-inside space-y-1.5 text-muted-foreground italic">
                {assessment.questions.map((q) => (
                  <li
                    key={q.id}
                    className="line-clamp-2 pl-1 text-[11px] leading-relaxed"
                  >
                    {`"${stripHtml(q.questionText)}"`}
                  </li>
                ))}
              </ul>
            </div>
          )}

        {/* Expandable questions drawer list inside the card */}
        {isExpanded && (
          <div className="border border-primary/10 rounded-lg p-3 text-xs space-y-2 bg-primary/[0.01] animate-fade-in max-h-52 overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-1.5 gap-2">
              <p className="font-bold text-primary flex items-center gap-1">
                <Layers className="h-3.5 w-3.5 text-primary" />
                Pilih Butir Soal:
              </p>
              {!loadingQuestions && filteredQuestions.length > 0 && (
                <button
                  type="button"
                  onClick={handleToggleSelectAll}
                  className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1"
                >
                  {isAllSelected ? (
                    <>
                      <Square className="h-3 w-3 text-muted-foreground" />
                      <span>Batal Semua</span>
                    </>
                  ) : (
                    <>
                      <CheckSquare className="h-3 w-3" />
                      <span>Pilih Semua</span>
                    </>
                  )}
                </button>
              )}
            </div>
            {loadingQuestions ? (
              <div className="flex items-center justify-center py-4 gap-1.5 text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Memuat butir soal...</span>
              </div>
            ) : filteredQuestions.length === 0 ? (
              <p className="text-[11px] text-muted-foreground italic py-1 text-center">
                Tidak ada soal yang sesuai dengan tipe filter di dalam paket
                ini.
              </p>
            ) : (
              <div className="space-y-2 pt-1">
                {filteredQuestions.map((q, idx) => {
                  const checked = isSelected(q.id);
                  const cartItem: CartItem = {
                    id: q.id,
                    questionText: q.questionText,
                    type: q.type as
                      | "MULTIPLE_CHOICE"
                      | "TRUE_FALSE"
                      | "SHORT_ANSWER"
                      | "MATCHING",
                    options: q.options.map((opt) => ({
                      id: opt.id,
                      optionText: opt.optionText,
                      isCorrect: opt.isCorrect,
                    })),
                    answerKey: q.answerKey,
                    assessmentId: assessment.id,
                    assessmentTextSnippet: `Paket ${getTypeLabel(assessment.questionType)}`,
                  };

                  return (
                    <div
                      key={q.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleQuestion(cartItem);
                      }}
                      className={`flex items-start gap-2 p-2 rounded-md border cursor-pointer hover:bg-primary/[0.03] transition-colors ${
                        checked
                          ? "border-primary/30 bg-primary/[0.02]"
                          : "border-border/60 bg-background"
                      }`}
                    >
                      <button
                        type="button"
                        className="text-primary mt-0.5 shrink-0"
                      >
                        {checked ? (
                          <CheckSquare className="h-4 w-4 fill-primary/5" />
                        ) : (
                          <Square className="h-4 w-4 text-muted-foreground/80" />
                        )}
                      </button>
                      <div className="text-[11px] leading-relaxed font-medium text-foreground flex items-start gap-1">
                        <strong className="text-primary shrink-0">
                          {idx + 1}.
                        </strong>
                        <div
                          className="prose prose-sm dark:prose-invert max-w-none inline-block"
                          dangerouslySetInnerHTML={{ __html: q.questionText }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter className="pt-2 border-t flex justify-between gap-1 bg-muted/10 rounded-b-xl flex-wrap">
        <Button
          onClick={() => onDelete(assessment.id)}
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-destructive hover:bg-destructive/5 h-8 w-8"
        >
          <Trash2 className="h-4 w-4" />
        </Button>

        <div className="flex gap-1.5 ml-auto">
          <Button
            onClick={handleToggleExpand}
            variant="ghost"
            size="sm"
            className={`h-8 px-2 flex items-center gap-1 text-xs font-semibold ${
              isExpanded ? "text-primary bg-primary/5" : "text-muted-foreground"
            }`}
          >
            <span>{isExpanded ? "Tutup" : "Pilih Soal"}</span>
            {isExpanded ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </Button>
          <Button
            onClick={() =>
              router.push(
                `/dashboard/assessment/${assessment.id}?source=bank-soal`,
              )
            }
            variant="secondary"
            size="sm"
            className="h-8 px-2.5 flex items-center gap-1.5 text-xs font-semibold"
          >
            <span>Buka Paket</span>
            <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
