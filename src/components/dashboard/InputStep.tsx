"use client";

import { useRef } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  FileText,
  Image as ImageIcon,
  Upload,
  Trash2,
  ArrowRight,
  Clipboard,
} from "lucide-react";
import { useDialog } from "@/components/ui/dialog-provider";

interface InputStepProps {
  inputType: "TEXT" | "IMAGE";
  setInputType: (type: "TEXT" | "IMAGE") => void;
  rawText: string;
  setRawText: (text: string) => void;
  selectedFile: File | null;
  setSelectedFile: (file: File | null) => void;
  imagePreview: string | null;
  setImagePreview: (preview: string | null) => void;
  onNext: () => void;
  onStartManual: () => void;
}

export function InputStep({
  inputType,
  setInputType,
  rawText,
  setRawText,
  selectedFile,
  setSelectedFile,
  imagePreview,
  setImagePreview,
  onNext,
  onStartManual,
}: InputStepProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showAlert } = useDialog();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);

      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleContinue = () => {
    if (inputType === "TEXT" && !rawText.trim()) {
      showAlert(
        "Materi Kosong",
        "Silakan masukkan teks materi pelajaran terlebih dahulu.",
      );
      return;
    }
    if (inputType === "IMAGE" && !selectedFile) {
      showAlert(
        "Gambar Kosong",
        "Silakan unggah gambar materi pelajaran terlebih dahulu.aaaaaa",
      );
      return;
    }
    onNext();
  };

  return (
    <Card>
      <CardHeader className="space-y-1.5 pb-6">
        <CardTitle className="text-2xl font-bold tracking-tight">
          Tahap 1: Input Materi Pelajaran
        </CardTitle>
        <CardDescription>
          Pilih metode input materi yang ingin Anda gunakan sebagai bahan dasar
          pembuatan soal asesmen.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Metode Input Tabs */}
        <div className="grid grid-cols-2 gap-4 bg-muted/50 p-1.5 rounded-lg border border-border">
          <Button
            onClick={() => setInputType("TEXT")}
            variant={inputType === "TEXT" ? "default" : "ghost"}
            className="flex items-center gap-2 h-10 font-semibold"
          >
            <FileText className="h-4 w-4" />
            <span>Masukkan Teks</span>
          </Button>
          <Button
            onClick={() => setInputType("IMAGE")}
            variant={inputType === "IMAGE" ? "default" : "ghost"}
            className="flex items-center gap-2 h-10 font-semibold"
          >
            <ImageIcon className="h-4 w-4" />
            <span>Unggah Gambar</span>
          </Button>
        </div>

        {/* Form area */}
        {inputType === "TEXT" ? (
          <div className="space-y-2">
            <label className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <Clipboard className="h-4 w-4 text-primary" />
              Tempelkan Materi Pelajaran atau Tuliskan Perintah (Prompt)
            </label>
            <Textarea
              placeholder="Tempelkan teks materi pelajaran Anda, ATAU tuliskan perintah langsung seperti: 'Buat soal ulangan matematika materi pecahan kelas 7 semester 1'..."
              className="min-h-[250px] resize-y p-4"
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
            />
            <p className="text-right text-xs text-muted-foreground">
              Jumlah karakter: {rawText.length}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <label className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <ImageIcon className="h-4 w-4 text-primary" />
              Unggah Tangkapan Layar (Screenshot) / Foto Materi
            </label>

            {!selectedFile ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 transition-colors bg-muted/25 rounded-xl p-10 flex flex-col items-center justify-center gap-3 cursor-pointer group"
              >
                <div className="bg-background shadow p-3 rounded-full text-muted-foreground group-hover:text-primary group-hover:scale-105 transition-transform duration-300">
                  <Upload className="h-6 w-6" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold">
                    Pilih berkas gambar atau seret ke sini
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PNG, JPG, JPEG hingga 5MB
                  </p>
                </div>
              </div>
            ) : (
              <div className="border border-border rounded-xl p-4 flex flex-col md:flex-row items-center gap-4 bg-muted/20">
                {imagePreview && (
                  <div className="relative w-full md:w-32 h-24 rounded-lg overflow-hidden border border-border bg-card">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="flex-1 text-center md:text-left space-y-1">
                  <p className="font-semibold text-sm truncate max-w-xs">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <Button
                  onClick={removeSelectedFile}
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:bg-destructive/10 flex items-center gap-1.5"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Hapus</span>
                </Button>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        )}

        <div className="relative flex py-2 items-center">
          <div className="flex-grow border-t border-border"></div>
          <span className="flex-shrink mx-4 text-xs font-semibold uppercase text-muted-foreground select-none">
            Atau
          </span>
          <div className="flex-grow border-t border-border"></div>
        </div>

        <div className="flex flex-col items-center justify-center p-6 border border-dashed border-primary/20 bg-primary/[0.01] rounded-xl text-center space-y-2">
          <p className="text-sm font-semibold text-foreground">
            Buat Paket Soal secara Manual dari Awal
          </p>
          <p className="text-xs text-muted-foreground max-w-md">
            Lewati pengunggahan materi pelajaran dan tulis butir soal Anda
            sendiri satu per satu.
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={onStartManual}
            className="text-xs font-semibold h-9 px-4 border-primary/30 text-primary hover:bg-primary/5 mt-1"
          >
            Mulai Buat Manual
          </Button>
        </div>
      </CardContent>

      <CardFooter className="flex items-center justify-between border-t border-border pt-6 pb-6 bg-muted/10">
        <p className="text-xs text-muted-foreground max-w-sm hidden sm:block">
          Materi ini akan digunakan oleh sistem AI untuk menyusun soal ujian
          secara akurat sesuai konteks.
        </p>
        <Button
          onClick={handleContinue}
          className="w-full sm:w-auto h-11 px-6 font-bold flex items-center gap-2 shadow-sm transition-transform active:scale-[0.98] ml-auto"
        >
          <span>Lanjutkan ke Konfigurasi</span>
          <ArrowRight className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
