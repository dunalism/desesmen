"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, Edit, Check, Square, CheckSquare } from "lucide-react";
import { Question } from "@/lib/types";
import { InlineQuestionEditor } from "@/components/dashboard/InlineQuestionEditor";

interface QuestionCardProps {
  question: Question;
  index: number;
  onUpdate: (updatedQuestion: Question) => void;
  onDelete: (id: string) => void;
  showCheckbox?: boolean;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

export function QuestionCard({
  question,
  index,
  onUpdate,
  onDelete,
  showCheckbox = false,
  checked = false,
  onCheckedChange,
}: QuestionCardProps) {
  const [isEditing, setIsEditing] = useState(false);

  if (isEditing) {
    return (
      <InlineQuestionEditor
        initialQuestion={question}
        index={index}
        allowedType={question.type}
        onSave={(updatedQuestion) => {
          onUpdate(updatedQuestion);
          setIsEditing(false);
        }}
        onCancel={() => setIsEditing(false)}
      />
    );
  }

  return (
    <Card className="hover:shadow-md transition-shadow relative overflow-hidden group">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
        <CardTitle className="text-base font-bold flex items-center gap-2 select-none">
          {showCheckbox && (
            <button
              onClick={() => onCheckedChange?.(!checked)}
              className="text-primary hover:scale-105 active:scale-95 transition-transform mr-1 cursor-pointer"
              type="button"
            >
              {checked ? (
                <CheckSquare className="h-5 w-5 fill-primary/10" />
              ) : (
                <Square className="h-5 w-5 text-muted-foreground" />
              )}
            </button>
          )}
          <span className="bg-primary/10 text-primary rounded-full w-6 h-6 flex items-center justify-center text-xs">
            {index + 1}
          </span>
          <span>
            Soal{" "}
            {question.type === "MULTIPLE_CHOICE"
              ? "Pilihan Ganda"
              : question.type === "TRUE_FALSE"
                ? "Benar/Salah"
                : question.type === "MATCHING"
                  ? "Menjodohkan (Matching)"
                  : "Uraian/Esai"}
          </span>
        </CardTitle>
        <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
          <Button
            onClick={() => setIsEditing(true)}
            size="icon"
            variant="outline"
            className="h-8 w-8 cursor-pointer"
            title="Edit Soal"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            onClick={() => onDelete(question.id)}
            size="icon"
            variant="outline"
            className="h-8 w-8 text-destructive hover:bg-destructive/10 cursor-pointer"
            title="Hapus Soal"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Question Text */}
        {question.type !== "MATCHING" && (
          <div
            className="font-medium text-foreground text-base leading-relaxed prose prose-sm dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: question.questionText }}
          />
        )}

        {/* Layout khusus untuk Menjodohkan */}
        {question.type === "MATCHING" && (
          <div className="pt-2 grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            {/* Left Premise */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase block">
                Premis / Istilah (Kolom Kiri)
              </label>
              <div
                className="bg-muted/40 border border-border/80 rounded-lg py-2.5 px-3 text-sm font-semibold text-foreground prose prose-sm dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: question.questionText }}
              />
            </div>

            {/* Right Matching Definition */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase block">
                Kunci Jawaban Pasangan (Kolom Kanan)
              </label>
              <div className="bg-primary/[0.03] border border-primary/20 rounded-lg py-2.5 px-3 text-sm font-semibold text-primary">
                {question.answerKey}
              </div>
            </div>
          </div>
        )}

        {/* Options / Answers Area */}
        {question.type === "MULTIPLE_CHOICE" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {question.options.map((opt) => (
              <div
                key={opt.id}
                className={`flex items-center gap-2 border rounded-lg p-3 transition-colors ${
                  opt.isCorrect
                    ? "border-green-500/50 bg-green-500/5 dark:bg-green-500/10"
                    : "border-border hover:bg-muted/35"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
                    opt.isCorrect
                      ? "bg-green-500 border-green-500 text-white"
                      : "border-muted-foreground/30"
                  }`}
                >
                  {opt.isCorrect && <Check className="h-3 w-3 stroke-[3px]" />}
                </div>
                <span
                  className="text-sm font-medium prose prose-sm dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: opt.optionText }}
                />
              </div>
            ))}
          </div>
        )}

        {question.type === "TRUE_FALSE" && (
          <div className="flex gap-4 pt-2">
            {["Benar", "Salah"].map((val) => {
              const isCorrect =
                question.answerKey.toLowerCase() === val.toLowerCase();
              return (
                <div
                  key={val}
                  className={`flex-1 py-2.5 px-4 text-sm font-semibold border rounded-lg flex items-center justify-center gap-2 transition-colors ${
                    isCorrect
                      ? "border-green-500 bg-green-500/5 text-green-700 dark:text-green-400"
                      : "border-border bg-transparent"
                  }`}
                >
                  <div
                    className={`w-4.5 h-4.5 rounded-full border flex items-center justify-center ${
                      isCorrect
                        ? "border-green-500 bg-green-500"
                        : "border-muted-foreground/40"
                    }`}
                  >
                    {isCorrect && (
                      <div className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </div>
                  <span>{val}</span>
                </div>
              );
            })}
          </div>
        )}

        {question.type === "SHORT_ANSWER" && (
          <div className="pt-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">
              Kunci Jawaban Esai
            </label>
            <div className="bg-muted/50 border border-border rounded-lg py-2 px-3 text-sm font-semibold">
              {question.answerKey}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
