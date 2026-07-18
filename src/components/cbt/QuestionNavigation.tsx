"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface QuestionNavigationProps {
  questions: Array<{ id: string; order: number }>;
  currentQuestionIndex: number;
  onSelectQuestion: (index: number) => void;
  answers: Record<
    string,
    { answerText?: string; optionId?: string; isDoubtful?: boolean }
  >;
}

export default function QuestionNavigation({
  questions,
  currentQuestionIndex,
  onSelectQuestion,
  answers,
}: QuestionNavigationProps) {
  // Calculate statistics
  const total = questions.length;
  let answeredCount = 0;
  let doubtfulCount = 0;

  questions.forEach((q) => {
    const ans = answers[q.id];
    if (ans) {
      if (ans.isDoubtful) {
        doubtfulCount++;
      }
      if (ans.optionId || (ans.answerText && ans.answerText.trim() !== "")) {
        if (!ans.isDoubtful) {
          answeredCount++;
        }
      }
    }
  });

  const unansweredCount = total - answeredCount - doubtfulCount;

  return (
    <div className="flex flex-col h-full bg-card rounded-xl border p-4 space-y-4">
      <div>
        <h3 className="font-heading font-bold text-sm tracking-wide uppercase text-muted-foreground mb-3">
          Status Jawaban
        </h3>
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-primary/10 border border-primary/20 text-primary">
            <span className="text-lg font-bold">{answeredCount}</span>
            <span className="text-[10px] uppercase font-semibold text-muted-foreground">
              Dijawab
            </span>
          </div>
          <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
            <span className="text-lg font-bold">{doubtfulCount}</span>
            <span className="text-[10px] uppercase font-semibold text-muted-foreground">
              Ragu
            </span>
          </div>
          <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-muted border border-border text-muted-foreground">
            <span className="text-lg font-bold">{unansweredCount}</span>
            <span className="text-[10px] uppercase font-semibold text-muted-foreground">
              Belum
            </span>
          </div>
        </div>
      </div>

      <div className="border-t pt-4">
        <h3 className="font-heading font-bold text-sm tracking-wide uppercase text-muted-foreground  mb-3">
          Nomor Soal
        </h3>
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 overflow-y-auto max-h-[350px] p-1">
          {questions.map((q, idx) => {
            const ans = answers[q.id];
            const isCurrent = idx === currentQuestionIndex;
            const hasAnswer =
              ans &&
              (ans.optionId ||
                (ans.answerText && ans.answerText.trim() !== ""));
            const isDoubtful = ans?.isDoubtful;

            let buttonClass =
              "border border-input bg-background hover:bg-muted text-foreground";
            if (isDoubtful) {
              buttonClass =
                "bg-amber-500 hover:bg-amber-600 text-white border-transparent";
            } else if (hasAnswer) {
              buttonClass =
                "bg-primary hover:bg-primary/90 text-primary-foreground border-transparent";
            }

            return (
              <Button
                key={q.id}
                size="icon"
                onClick={() => onSelectQuestion(idx)}
                className={cn(
                  "font-semibold text-sm transition-all h-10 w-full relative",
                  buttonClass,
                  isCurrent &&
                    "ring-2 ring-foreground ring-offset-2 dark:ring-offset-background",
                )}
              >
                {idx + 1}
              </Button>
            );
          })}
        </div>
      </div>

      <div className="border-t pt-4 text-[11px] text-muted-foreground space-y-1.5 font-medium">
        <div className="flex items-center gap-2">
          <div className="size-3 rounded bg-primary" />
          <span>Sudah Dijawab</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="size-3 rounded bg-amber-500" />
          <span>Ragu-Ragu</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="size-3 rounded border bg-background" />
          <span>Belum Dijawab</span>
        </div>
      </div>
    </div>
  );
}
