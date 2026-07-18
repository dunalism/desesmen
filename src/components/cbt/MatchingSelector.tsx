"use client";

import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MatchingSelectorProps {
  question: {
    id: string;
    questionText: string;
    options: { id: string; optionText: string }[];
  };
  value?: string;
  onChange: (value: string) => void;
}

export default function MatchingSelector({
  question,
  value,
  onChange,
}: MatchingSelectorProps) {
  const handleSelectOption = (text: string) => {
    onChange(text);
  };

  const handleClear = () => {
    onChange("");
  };

  return (
    <div className="space-y-4">
      {/* Title / Instruction */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
          Pilih Pasangan yang Cocok untuk Istilah di Bawah
        </label>
        {value && (
          <Button
            variant="ghost"
            size="xs"
            onClick={handleClear}
            className="text-destructive hover:text-destructive hover:bg-destructive/10 text-xs font-semibold"
          >
            <X className="h-3 w-3 mr-1" /> Hapus Pilihan
          </Button>
        )}
      </div>

      {/* Premise Display */}
      <div className="bg-muted/40 border rounded-xl p-4 md:p-5">
        <span className="text-xs font-bold uppercase text-primary tracking-wide block mb-1">
          Istilah / Premis:
        </span>
        <div
          className="text-foreground text-lg md:text-xl font-bold leading-relaxed prose prose-sm dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: question.questionText }}
        />
      </div>

      {/* Definitions/Pairs Choice Pool */}
      <div className="space-y-2">
        <span className="text-xs font-bold uppercase text-muted-foreground tracking-wide block mb-2">
          Pilihan Pasangan/Definisi (Pilih salah satu):
        </span>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {question.options.map((opt) => {
            const isSelected = value === opt.optionText;

            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleSelectOption(opt.optionText)}
                className={`flex items-start gap-3.5 text-left border rounded-xl p-4 transition-all outline-none focus-visible:ring-2 focus-visible:ring-primary h-full ${
                  isSelected
                    ? "border-primary bg-primary/5 dark:bg-primary/10 ring-1 ring-primary"
                    : "border-border hover:bg-muted/40"
                }`}
              >
                {/* Radio selection circle icon */}
                <div
                  className={`size-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                    isSelected
                      ? "bg-primary border-primary text-primary-foreground"
                      : "border-muted-foreground/30 text-transparent"
                  }`}
                >
                  {isSelected && <Check className="h-3 w-3 stroke-[3px]" />}
                </div>

                <div className="space-y-1">
                  <span className="text-sm font-semibold leading-relaxed text-foreground block">
                    {opt.optionText}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Indicator status on mobile */}
      {value && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-xs flex items-center gap-2 text-primary font-medium">
          <Check className="h-4 w-4 shrink-0" />
          <span>
            Terpilih: <strong className="font-bold">{value}</strong>
          </span>
        </div>
      )}
    </div>
  );
}
