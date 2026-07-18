"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Plus, Trash2 } from "lucide-react";
import { useDialog } from "@/components/ui/dialog-provider";
import { Option, Question } from "@/lib/types";
import dynamic from "next/dynamic";

// Dynamic import of RichTextEditor to avoid SSR hydration crash
const RichTextEditor = dynamic(() => import("../ui/rich-text-editor"), {
  ssr: false,
  loading: () => (
    <div className="h-[120px] rounded-lg border border-input bg-muted/20 animate-pulse flex items-center justify-center text-xs text-muted-foreground">
      Memuat Editor Teks...
    </div>
  ),
});

interface InlineQuestionEditorProps {
  initialQuestion?: Question;
  index?: number;
  allowedType?: string;
  onSave: (question: Question) => void;
  onCancel: () => void;
}

export function InlineQuestionEditor({
  initialQuestion,
  index,
  allowedType,
  onSave,
  onCancel,
}: InlineQuestionEditorProps) {
  const { showAlert } = useDialog();

  const isEditMode = !!initialQuestion;

  const [questionText, setQuestionText] = useState(
    initialQuestion?.questionText || "",
  );
  const [questionType, setNewQuestionType] = useState<
    "MULTIPLE_CHOICE" | "TRUE_FALSE" | "SHORT_ANSWER" | "MATCHING"
  >(() => {
    if (initialQuestion?.type) return initialQuestion.type;
    if (allowedType && allowedType !== "MIXED" && allowedType !== "Campuran") {
      return allowedType as
        | "MULTIPLE_CHOICE"
        | "TRUE_FALSE"
        | "SHORT_ANSWER"
        | "MATCHING";
    }
    return "MULTIPLE_CHOICE";
  });

  // State Pilihan Ganda (MULTIPLE_CHOICE)
  const [options, setOptions] = useState<string[]>(() => {
    if (
      initialQuestion?.type === "MULTIPLE_CHOICE" &&
      initialQuestion.options
    ) {
      return initialQuestion.options.map((opt) => opt.optionText);
    }
    return ["", "", "", ""];
  });

  const [correctOptionIdx, setCorrectOptionIdx] = useState<number>(() => {
    if (
      initialQuestion?.type === "MULTIPLE_CHOICE" &&
      initialQuestion.options
    ) {
      const idx = initialQuestion.options.findIndex((opt) => opt.isCorrect);
      return idx >= 0 ? idx : 0;
    }
    return 0;
  });

  // State Benar / Salah (TRUE_FALSE)
  const [trueFalseAnswer, setTrueFalseAnswer] = useState<"TRUE" | "FALSE">(
    () => {
      if (initialQuestion?.type === "TRUE_FALSE") {
        return initialQuestion.answerKey === "Benar" ||
          initialQuestion.answerKey === "TRUE"
          ? "TRUE"
          : "FALSE";
      }
      return "TRUE";
    },
  );

  // State Menjodohkan (MATCHING)
  const [matchingAnswer, setMatchingAnswer] = useState(() => {
    return initialQuestion?.type === "MATCHING"
      ? initialQuestion.answerKey
      : "";
  });

  // State Esai / Uraian (SHORT_ANSWER)
  const [essayAnswer, setEssayAnswer] = useState(() => {
    return initialQuestion?.type === "SHORT_ANSWER"
      ? initialQuestion.answerKey
      : "";
  });

  const handleAddOption = () => {
    if (options.length < 5) {
      setOptions([...options, ""]);
    }
  };

  const handleRemoveOption = (index: number) => {
    if (options.length > 2) {
      const updated = options.filter((_, idx) => idx !== index);
      setOptions(updated);
      if (correctOptionIdx >= updated.length) {
        setCorrectOptionIdx(0);
      }
    }
  };

  const handleSaveClick = () => {
    if (!questionText.trim() || questionText === "<p></p>") {
      showAlert("Validasi Gagal", "Teks pertanyaan tidak boleh kosong.");
      return;
    }

    const questionId = initialQuestion?.id || `manual-${Date.now()}`;
    let mappedOptions: Option[] = [];
    let answerKey = "";

    if (questionType === "MULTIPLE_CHOICE") {
      if (options.some((opt) => !opt.trim())) {
        showAlert("Validasi Gagal", "Harap isi semua teks pilihan jawaban.");
        return;
      }
      mappedOptions = options.map((opt, idx) => {
        // Reuse option ID if editing to avoid creating new records/deleting old ones in DB
        const existingOptId =
          initialQuestion?.type === "MULTIPLE_CHOICE"
            ? initialQuestion.options[idx]?.id
            : null;

        return {
          id: existingOptId || `${questionId}-opt-${idx}`,
          optionText: opt.trim(),
          isCorrect: idx === correctOptionIdx,
        };
      });
      answerKey = options[correctOptionIdx].trim();
    } else if (questionType === "TRUE_FALSE") {
      mappedOptions = [
        {
          id:
            (initialQuestion?.type === "TRUE_FALSE" &&
              initialQuestion.options[0]?.id) ||
            `${questionId}-opt-0`,
          optionText: "Benar",
          isCorrect: trueFalseAnswer === "TRUE",
        },
        {
          id:
            (initialQuestion?.type === "TRUE_FALSE" &&
              initialQuestion.options[1]?.id) ||
            `${questionId}-opt-1`,
          optionText: "Salah",
          isCorrect: trueFalseAnswer === "FALSE",
        },
      ];
      answerKey = trueFalseAnswer === "TRUE" ? "Benar" : "Salah";
    } else if (questionType === "MATCHING") {
      if (!matchingAnswer.trim()) {
        showAlert(
          "Validasi Gagal",
          "Harap isi kunci jawaban pasangan (kolom kanan).",
        );
        return;
      }
      answerKey = matchingAnswer.trim();
    } else {
      // SHORT_ANSWER / Esai
      if (!essayAnswer.trim()) {
        showAlert("Validasi Gagal", "Harap isi contoh kunci jawaban esai.");
        return;
      }
      answerKey = essayAnswer.trim();
    }

    const updatedQuestion: Question = {
      id: questionId,
      questionText: questionText,
      type: questionType,
      options: mappedOptions,
      answerKey,
      order: initialQuestion?.order || (index !== undefined ? index + 1 : 1),
    };

    onSave(updatedQuestion);
  };

  return (
    <Card className="border-2 border-primary/30 shadow-lg bg-card/65 animate-fade-in relative overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-sm font-bold tracking-tight text-primary uppercase flex items-center gap-1.5">
          <Plus className="h-4 w-4" />
          <span>
            {!isEditMode
              ? "Tulis Soal Baru secara Manual"
              : `Edit Soal #${(index ?? 0) + 1}`}
          </span>
        </CardTitle>
        <Button
          onClick={onCancel}
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          type="button"
        >
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Tipe Soal & Kesulitan */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase">
              Tipe Soal
            </label>
            <select
              value={questionType}
              disabled={
                isEditMode ||
                (!!allowedType &&
                  allowedType !== "MIXED" &&
                  allowedType !== "Campuran")
              }
              onChange={(e) => {
                setNewQuestionType(
                  e.target.value as
                    | "MULTIPLE_CHOICE"
                    | "TRUE_FALSE"
                    | "SHORT_ANSWER"
                    | "MATCHING",
                );
              }}
              className="w-full bg-background border border-input px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-all cursor-pointer font-medium disabled:opacity-70 disabled:cursor-not-allowed disabled:bg-muted/30"
            >
              <option value="MULTIPLE_CHOICE">Pilihan Ganda</option>
              <option value="TRUE_FALSE">Benar / Salah</option>
              <option value="MATCHING">Menjodohkan (Matching)</option>
              <option value="SHORT_ANSWER">Uraian / Esai</option>
            </select>
          </div>
        </div>

        {/* Teks Soal */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-muted-foreground uppercase block">
            {questionType === "MATCHING"
              ? "Premis / Istilah (Kolom Kiri)"
              : "Teks Pertanyaan (Rich Text)"}
          </label>
          <RichTextEditor
            value={questionText}
            onChange={setQuestionText}
            placeholder={
              questionType === "MATCHING"
                ? "Masukkan istilah / pertanyaan..."
                : "Tulis pertanyaan di sini..."
            }
          />
        </div>

        {/* Form Opsi Dinamis Berdasarkan Tipe Soal */}
        {questionType === "MULTIPLE_CHOICE" && (
          <div className="space-y-3 pt-3 border-t border-dashed border-border/80">
            <label className="text-xs font-bold text-muted-foreground uppercase block">
              Pilihan Jawaban (Pilih radio untuk jawaban yang benar)
            </label>
            <div className="space-y-2">
              {options.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="correctOptionManual"
                    checked={correctOptionIdx === idx}
                    onChange={() => setCorrectOptionIdx(idx)}
                    className="h-4.5 w-4.5 text-primary focus:ring-primary/25 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-muted-foreground w-6 text-center">
                    {String.fromCharCode(65 + idx)}.
                  </span>
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => {
                      const updated = [...options];
                      updated[idx] = e.target.value;
                      setOptions(updated);
                    }}
                    placeholder={`Masukkan teks jawaban ${String.fromCharCode(65 + idx)}...`}
                    className="flex-grow px-3 py-1.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-all font-medium"
                  />
                  {options.length > 2 && (
                    <Button
                      onClick={() => handleRemoveOption(idx)}
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                      type="button"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {options.length < 5 && (
              <div className="flex justify-end pt-1">
                <Button
                  onClick={handleAddOption}
                  variant="outline"
                  size="xs"
                  className="text-xs font-bold text-primary gap-1"
                  type="button"
                >
                  <Plus className="h-3 w-3" />
                  <span>
                    Tambah Pilihan {String.fromCharCode(65 + options.length)}
                  </span>
                </Button>
              </div>
            )}
          </div>
        )}

        {questionType === "TRUE_FALSE" && (
          <div className="space-y-3 pt-3 border-t border-dashed border-border/80">
            <label className="text-xs font-bold text-muted-foreground uppercase block">
              Tentukan Jawaban yang Benar
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer py-1.5 px-3 rounded-lg border hover:bg-muted/40 transition-colors">
                <input
                  type="radio"
                  name="tfAnswerManual"
                  checked={trueFalseAnswer === "TRUE"}
                  onChange={() => setTrueFalseAnswer("TRUE")}
                  className="h-4 w-4 text-primary"
                />
                <span className="text-sm font-semibold">Benar</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer py-1.5 px-3 rounded-lg border hover:bg-muted/40 transition-colors">
                <input
                  type="radio"
                  name="tfAnswerManual"
                  checked={trueFalseAnswer === "FALSE"}
                  onChange={() => setTrueFalseAnswer("FALSE")}
                  className="h-4 w-4 text-primary"
                />
                <span className="text-sm font-semibold">Salah</span>
              </label>
            </div>
          </div>
        )}

        {questionType === "MATCHING" && (
          <div className="space-y-2 pt-3 border-t border-dashed border-border/80">
            <label className="text-xs font-bold text-muted-foreground uppercase block">
              Kunci Jawaban Pasangan (Kolom Kanan)
            </label>
            <input
              type="text"
              value={matchingAnswer}
              onChange={(e) => setMatchingAnswer(e.target.value)}
              placeholder="Masukkan teks definisi / pasangan yang benar..."
              className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-all font-medium"
            />
          </div>
        )}

        {questionType === "SHORT_ANSWER" && (
          <div className="space-y-2 pt-3 border-t border-dashed border-border/80">
            <label className="text-xs font-bold text-muted-foreground uppercase block">
              Contoh Kunci Jawaban Esai / Uraian
            </label>
            <textarea
              value={essayAnswer}
              onChange={(e) => setEssayAnswer(e.target.value)}
              placeholder="Masukkan deskripsi kunci jawaban esai yang benar..."
              rows={3}
              className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-all font-medium resize-y"
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-3 border-t">
          <Button onClick={onCancel} variant="outline" size="sm" type="button">
            Batal
          </Button>
          <Button
            onClick={handleSaveClick}
            size="sm"
            type="button"
            className="font-bold shadow-md cursor-pointer"
          >
            {isEditMode ? "Simpan Perubahan" : "Tambahkan Soal"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
