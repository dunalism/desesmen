"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { ReviewStep } from "@/components/dashboard/ReviewStep";
import { ProgressBar } from "@/components/dashboard/ProgressBar";
import { Loader2, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDialog } from "@/components/ui/dialog-provider";
import { Assessment, Question } from "@/lib/types";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";

interface AssessmentPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ source?: string }>;
}

export default function AssessmentReviewPage({
  params,
  searchParams,
}: AssessmentPageProps) {
  const router = useRouter();
  const { id } = use(params);
  const resolvedSearchParams = use(searchParams);
  const source = resolvedSearchParams.source;
  const { showAlert } = useDialog();

  const [isSaving, setIsSaving] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [initialQuestions, setInitialQuestions] = useState<Question[]>([]);

  const [showScrollUp, setShowScrollUp] = useState(false);
  const [showScrollDown, setShowScrollDown] = useState(false);

  // SWR Caching Client-Side
  const { data, error, isLoading, mutate } = useSWR(
    id ? `/api/assessments/${id}` : null,
    fetcher,
  );

  // Sync SWR cache data to local editable state during render (React recommended pattern)
  const [prevData, setPrevData] = useState<{ assessment: Assessment } | null>(
    null,
  );
  if (data !== prevData) {
    setPrevData(data);
    if (data && data.assessment) {
      const mappedQuestions: Question[] = data.assessment.questions.map(
        (q: Question) => ({
          id: q.id,
          questionText: q.questionText,
          type: q.type,
          options: q.options.map((opt) => ({
            id: opt.id,
            optionText: opt.optionText,
            isCorrect: opt.isCorrect,
          })),
          answerKey: q.answerKey,
        }),
      );
      setQuestions(mappedQuestions);
      setInitialQuestions(JSON.parse(JSON.stringify(mappedQuestions)));
    }
  }

  // Auto-scroll logic
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = document.documentElement.clientHeight;

      setShowScrollUp(scrollY > 200);
      setShowScrollDown(scrollHeight - scrollY - clientHeight > 200);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, [questions]);

  useEffect(() => {
    if (!isLoading) {
      const timer = setTimeout(() => {
        window.dispatchEvent(new Event("scroll"));
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isLoading, questions]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const scrollToBottom = () => {
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: "smooth",
    });
  };

  // Handle errors from SWR
  useEffect(() => {
    if (error) {
      console.error("Fetch error:", error);
      showAlert(
        "Gagal Memuat",
        error.message || "Terjadi kesalahan saat memuat data.",
      );
      router.push("/dashboard");
    }
  }, [error, router, showAlert]);

  // Handle saving the updated questions list to the database (MySQL)
  const handleSaveToBankSoal = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/assessments/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          questions,
        }),
      });

      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.error || "Gagal menyimpan perubahan.");
      }

      // Mutate local SWR cache
      if (data) {
        mutate(
          {
            ...data,
            assessment: {
              ...data.assessment,
              questions: questions,
            },
          },
          false,
        ); // don't refetch immediately, trust the client's state
      }

      setInitialQuestions(JSON.parse(JSON.stringify(questions))); // Reset state perubahan
      showAlert("Sukses", "Perubahan berhasil disimpan ke Bank Soal database");
    } catch (error) {
      const err = error as Error;
      console.error("Save error:", err);
      showAlert("Gagal Menyimpan", err.message || "Gagal menyimpan perubahan.");
    } finally {
      setIsSaving(false);
    }
  };

  // Hitung apakah ada perubahan pada soal dibanding data awal di DB
  const hasChanges =
    JSON.stringify(questions) !== JSON.stringify(initialQuestions);

  if (isLoading && !data) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-sm font-semibold text-muted-foreground">
          Memuat Data Asesmen dari Database...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto w-full">
      {source !== "bank-soal" && <ProgressBar currentStep="REVIEW" />}

      <ReviewStep
        questions={questions}
        setQuestions={setQuestions}
        title={data?.assessment?.title || null}
        inputType={data?.assessment?.inputType || "TEXT"}
        questionType={data?.assessment?.questionType || ""}
        difficulty={data?.assessment?.difficulty || ""}
        onBack={() => {
          if (source === "bank-soal") {
            router.push("/dashboard/bank-soal");
          } else {
            router.push("/dashboard");
          }
        }}
        onSaveToBankSoal={handleSaveToBankSoal}
        isSaving={isSaving}
        hasChanges={hasChanges}
      />

      {/* Floating Auto Scroll Buttons */}
      <div className="fixed right-4 bottom-24 sm:right-6 sm:bottom-28 md:right-8 md:bottom-32 z-40 flex flex-col gap-2">
        {showScrollUp && (
          <Button
            onClick={scrollToTop}
            size="icon"
            variant="outline"
            className="h-10 w-10 rounded-full bg-background/90 backdrop-blur-sm border-primary/25 shadow-md hover:bg-accent hover:text-accent-foreground transition-all duration-300"
            title="Scroll ke Atas"
          >
            <ArrowUp className="h-5 w-5" />
          </Button>
        )}
        {showScrollDown && (
          <Button
            onClick={scrollToBottom}
            size="icon"
            variant="outline"
            className="h-10 w-10 rounded-full bg-background/90 backdrop-blur-sm border-primary/25 shadow-md hover:bg-accent hover:text-accent-foreground transition-all duration-300"
            title="Scroll ke Bawah"
          >
            <ArrowDown className="h-5 w-5" />
          </Button>
        )}
      </div>
    </div>
  );
}
