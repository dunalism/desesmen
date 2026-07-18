"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { InputStep } from "@/components/dashboard/InputStep";
import { ConfigStep } from "@/components/dashboard/ConfigStep";
import { ProgressBar } from "@/components/dashboard/ProgressBar";
import { Loader2 } from "lucide-react";
import { useDialog } from "@/components/ui/dialog-provider";

export default function DashboardGeneratePage() {
  const router = useRouter();
  const { showAlert } = useDialog();
  const [step, setStep] = useState<"INPUT" | "CONFIG">("INPUT");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isManual, setIsManual] = useState(false);
  const [loadingText, setLoadingText] = useState("Menyusun Soal dengan AI...");

  // State Step 1: Input Materi
  const [inputType, setInputType] = useState<"TEXT" | "IMAGE">("TEXT");
  const [rawText, setRawText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // State Step 2: Konfigurasi
  const [questionType, setQuestionType] = useState<string>("MULTIPLE_CHOICE");
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [difficulty, setDifficulty] = useState<string>("MEDIUM");
  const [title, setTitle] = useState("");
  const [optionsCount, setOptionsCount] = useState<number>(4);

  // States untuk tipe soal Campuran (Mixed)
  const [mixedMcCount, setMixedMcCount] = useState<number>(3);
  const [mixedTfCount, setMixedTfCount] = useState<number>(2);
  const [mixedSaCount, setMixedSaCount] = useState<number>(2);
  const [mixedMatchCount, setMixedMatchCount] = useState<number>(3);

  const autoDistributeMixed = (total: number) => {
    const base = Math.floor(total / 4);
    const remainder = total % 4;

    setMixedMcCount(base + (remainder > 0 ? 1 : 0));
    setMixedTfCount(base + (remainder > 1 ? 1 : 0));
    setMixedSaCount(base + (remainder > 2 ? 1 : 0));
    setMixedMatchCount(base);
  };

  const handleSetQuestionCount = (count: number) => {
    const val = isNaN(count) || count < 0 ? 0 : count;
    setQuestionCount(val);
    autoDistributeMixed(val);
  };

  // Function to compress image using Canvas
  const compressImage = (
    file: File,
    maxWidth = 1200,
    quality = 0.7,
  ): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;

          // Pertahankan aspect ratio, tapi batasi lebar maksimal
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);

          // Ubah menjadi Blob dengan format jpeg dan kualitas yang dikurangi (0.7)
          canvas.toBlob(
            (blob) => {
              if (blob) resolve(blob);
              else reject(new Error("Canvas to Blob gagal"));
            },
            "image/jpeg",
            quality,
          );
        };
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleGenerateQuestions = async () => {
    setIsGenerating(true);
    let finalInputText = rawText;

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        showAlert(
          "Sesi Habis",
          "Sesi Anda telah habis. Silakan login kembali.",
        );
        router.push("/login");
        return;
      }

      if (!title) {
        showAlert(
          "Nama materi kosong",
          "Silakan masukkan nama materi terlebih dahulu.",
        );
        setIsGenerating(false);
        return;
      }

      // If image input, run Tesseract OCR client-side first!
      if (inputType === "IMAGE") {
        setLoadingText("Membaca teks dari gambar menggunakan OCR...");

        try {
          let fileToProcess: File | Blob = selectedFile!;

          // 1. Jika ukuran file lebih dari 1MB, kompres dulu di browser
          if (selectedFile!.size > 1024 * 1024) {
            try {
              fileToProcess = await compressImage(selectedFile!, 1200, 0.7);
              console.log(
                "Gambar berhasil dikompres dari:",
                selectedFile!.size,
                "ke:",
                fileToProcess.size,
              );
            } catch (compressError) {
              console.error(
                "Gagal mengompres gambar, lanjut pakai file asli:",
                compressError,
              );
            }
          }

          // 2. Jalankan Tesseract menggunakan file yang sudah ringan
          const Tesseract = (await import("tesseract.js")).default;
          const ocrResult = await Tesseract.recognize(fileToProcess, "ind+eng");
          finalInputText = ocrResult.data.text;

          if (!finalInputText || finalInputText.trim().length < 10) {
            showAlert(
              "Gagal Membaca",
              "Gagal mendeteksi teks dari gambar materi pelajaran. Silakan unggah gambar materi pelajaran dengan tulisan yang lebih jelas.",
            );
            setIsGenerating(false);
            return;
          }
        } catch (ocrError) {
          console.error("Client OCR Error:", ocrError);
          showAlert(
            "Gagal Membaca Gambar",
            "Terjadi kesalahan saat memproses gambar menggunakan OCR. Silakan coba lagi atau gunakan metode Salin & Tempel Teks.",
          );
          setIsGenerating(false);
          return;
        }
      }

      if (isManual) {
        setLoadingText("Membuat Paket Ujian Manual...");
      } else {
        setLoadingText("Menyusun Soal kustom dengan AI...");
      }

      // Validate mixed counts sum equals total count if type is MIXED (hanya jika AI)
      if (!isManual && questionType === "MIXED") {
        const sum =
          mixedMcCount + mixedTfCount + mixedSaCount + mixedMatchCount;
        if (sum !== questionCount) {
          showAlert(
            "Distribusi Soal Tidak Pas",
            `Jumlah sub-soal (${sum}) harus sama dengan total soal (${questionCount}). Silakan sesuaikan kembali atau klik Bagi Rata.`,
          );
          setIsGenerating(false);
          return;
        }
      }

      // 1. Call POST /api/assessments to save/generate in MySQL
      const response = await fetch("/api/assessments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: currentUser.uid,
          inputType,
          rawInputText: isManual ? "Pembuatan manual." : finalInputText,
          imageUrl: "",
          questionType,
          questionCount: isManual ? 0 : questionCount,
          difficulty,
          title: title.trim(),
          optionsCount,
          mixedMcCount: isManual ? 0 : mixedMcCount,
          mixedTfCount: isManual ? 0 : mixedTfCount,
          mixedSaCount: isManual ? 0 : mixedSaCount,
          mixedMatchCount: isManual ? 0 : mixedMatchCount,
          isManual,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Gagal membuat asesmen.");
      }

      // 2. Redirect Guru to the persistent Review subroute
      router.push(`/dashboard/assessment/${data.id}`);
    } catch (error: unknown) {
      console.error("Generate error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      showAlert(
        "Gagal Membuat Soal",
        errorMessage || "Terjadi kesalahan saat memproses materi.",
      );
    } finally {
      setIsGenerating(false);
    }
  };

  if (isGenerating) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <div className="text-center space-y-1">
          <p className="font-bold text-lg">{loadingText}</p>
          <p className="text-sm text-muted-foreground">
            Sistem sedang bekerja memproses materi dan merumuskan soal kustom di
            database.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto w-full">
      <ProgressBar currentStep={step} />

      {step === "INPUT" && (
        <InputStep
          inputType={inputType}
          setInputType={setInputType}
          rawText={rawText}
          setRawText={setRawText}
          selectedFile={selectedFile}
          setSelectedFile={setSelectedFile}
          imagePreview={imagePreview}
          setImagePreview={setImagePreview}
          onNext={() => {
            setIsManual(false);
            setStep("CONFIG");
          }}
          onStartManual={() => {
            setIsManual(true);
            setStep("CONFIG");
          }}
        />
      )}

      {step === "CONFIG" && (
        <ConfigStep
          questionType={questionType}
          setQuestionType={setQuestionType}
          questionCount={questionCount}
          setQuestionCount={handleSetQuestionCount}
          difficulty={difficulty}
          setDifficulty={setDifficulty}
          title={title}
          setTitle={setTitle}
          optionsCount={optionsCount}
          setOptionsCount={setOptionsCount}
          onBack={() => {
            setStep("INPUT");
          }}
          isManualMode={isManual}
          onGenerate={handleGenerateQuestions}
          mixedMcCount={mixedMcCount}
          setMixedMcCount={setMixedMcCount}
          mixedTfCount={mixedTfCount}
          setMixedTfCount={setMixedTfCount}
          mixedSaCount={mixedSaCount}
          setMixedSaCount={setMixedSaCount}
          mixedMatchCount={mixedMatchCount}
          setMixedMatchCount={setMixedMatchCount}
          autoDistribute={() => autoDistributeMixed(questionCount)}
        />
      )}
    </div>
  );
}
