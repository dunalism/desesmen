"use client";

import { useState } from "react";
import { useCart } from "@/lib/cart-context";
import { useDialog } from "@/components/ui/dialog-provider";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import {
  Sparkles,
  Download,
  X,
  FileText,
  Loader2,
  ListRestart,
  ArrowRight,
  Printer,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadAsWord, openPrintLayout } from "@/lib/export-utils";

export function FloatingCartBar() {
  const { selectedQuestions, clearCart, toggleQuestion } = useCart();
  const { showAlert, showConfirm } = useDialog();
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [showCompileModal, setShowCompileModal] = useState(false);

  if (selectedQuestions.length === 0) return null;

  const handleCompile = async () => {
    if (!newTitle.trim()) {
      showAlert("Judul Diperlukan", "Silakan masukkan nama paket baru.");
      return;
    }

    setIsCompiling(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        showAlert("Error", "Anda harus login terlebih dahulu.");
        return;
      }

      const response = await fetch("/api/assessments/remix", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: currentUser.uid,
          title: newTitle.trim(),
          questionIds: selectedQuestions.map((q) => q.id),
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        clearCart();
        setShowCompileModal(false);
        setNewTitle("");
        showAlert(
          "Sukses",
          "Kompilasi Berhasil! Mengalihkan ke paket soal baru...",
        );
        router.push(`/dashboard/assessment/${data.id}?source=bank-soal`);
      } else {
        setShowCompileModal(false);
        showAlert("Gagal", data.error || "Gagal mengompilasi paket baru.");
      }
    } catch (error) {
      console.error("Compile error:", error);
      setShowCompileModal(false);
      showAlert("Error", "Terjadi kesalahan saat mengompilasi paket baru.");
    } finally {
      setIsCompiling(false);
    }
  };

  const handleExport = (format: "WORD" | "PDF" | "PRINT") => {
    try {
      if (format === "WORD") {
        downloadAsWord(selectedQuestions, "Paket Remix Soal");
      } else {
        openPrintLayout(selectedQuestions, "Paket Remix Soal");
      }
    } catch (error) {
      console.error("Export error:", error);
      showAlert("Gagal Ekspor", "Terjadi kesalahan saat mengekspor dokumen.");
    }
  };

  return (
    <>
      {/* Compile Title Input Modal */}
      {showCompileModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-card border border-border shadow-2xl rounded-2xl max-w-md w-full p-6 space-y-4 animate-scale-in">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-yellow-500 animate-pulse" />
                  Kompilasi Paket Baru
                </h3>
                <p className="text-xs text-muted-foreground">
                  Satukan {selectedQuestions.length} butir soal pilihan Anda
                  menjadi paket ujian baru.
                </p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={() => setShowCompileModal(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase">
                Nama Paket Soal Baru
              </label>
              <input
                type="text"
                placeholder="Contoh: UAS Semester Ganjil IPA Terpadu"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full px-3 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-all"
                disabled={isCompiling}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCompile();
                }}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCompileModal(false)}
                disabled={isCompiling}
              >
                Batal
              </Button>
              <Button
                size="sm"
                onClick={handleCompile}
                disabled={isCompiling || !newTitle.trim()}
                className="flex items-center gap-1.5"
              >
                {isCompiling ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Mengompilasi...</span>
                  </>
                ) : (
                  <>
                    <span>Mulai Kompilasi</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Floating Cart Bar */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-3xl animate-slide-up">
        <div className="bg-card/90 backdrop-blur-md border border-primary/25 shadow-2xl rounded-2xl overflow-hidden">
          {/* Expanded Questions List Drawer */}
          {isOpen && (
            <div className="border-b border-muted max-h-60 overflow-y-auto p-4 space-y-3 bg-muted/10">
              <div className="flex justify-between items-center pb-2 border-b border-muted">
                <span className="text-xs font-bold text-muted-foreground uppercase">
                  Daftar Soal di Keranjang
                </span>
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() =>
                    showConfirm(
                      "Kosongkan Keranjang",
                      "Apakah Anda yakin ingin menghapus semua butir soal dari keranjang?",
                      clearCart,
                    )
                  }
                  className="text-xs text-destructive hover:bg-destructive/5 font-semibold h-7 px-2"
                >
                  Kosongkan Semua
                </Button>
              </div>
              <div className="space-y-2">
                {selectedQuestions.map((q, idx) => (
                  <div
                    key={q.id}
                    className="flex justify-between items-start gap-3 bg-background border border-border/60 p-2.5 rounded-lg text-xs"
                  >
                    <div className="flex-1 space-y-1">
                      <p className="font-semibold line-clamp-2 leading-relaxed">
                        <span className="text-primary mr-1">#{idx + 1}</span>
                        {q.questionText}
                      </p>
                      {q.assessmentTextSnippet && (
                        <p className="text-[10px] text-muted-foreground italic truncate">
                          Sumber: {q.assessmentTextSnippet}
                        </p>
                      )}
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
                      onClick={() => toggleQuestion(q)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active Control Bar */}
          <div className="flex items-center justify-between p-3.5 sm:p-4 gap-3 flex-wrap sm:flex-nowrap">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 text-primary h-10 px-3 rounded-xl flex items-center justify-center gap-1.5 font-bold text-sm">
                <Sparkles className="h-4 w-4 text-yellow-500 animate-pulse" />
                <span>Terpilih:</span>
                <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs">
                  {selectedQuestions.length}
                </span>
                <span>Soal</span>
              </div>
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-md transition-colors text-xs flex items-center gap-0.5"
                title={isOpen ? "Sembunyikan daftar" : "Lihat daftar"}
              >
                <span>{isOpen ? "Sembunyikan" : "Lihat Detail"}</span>
                {isOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronUp className="h-4 w-4" />
                )}
              </button>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              {/* Export Trigger Dropdown/Buttons */}
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport("PRINT")}
                  className="h-9 px-3 flex items-center gap-1.5 text-xs font-semibold"
                  title="Cetak Soal"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span className="hidden xs:inline">Cetak</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport("PDF")}
                  className="h-9 px-3 flex items-center gap-1.5 text-xs font-semibold"
                  title="Ekspor PDF"
                >
                  <FileText className="h-3.5 w-3.5 text-rose-500" />
                  <span className="hidden xs:inline">PDF</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport("WORD")}
                  className="h-9 px-3 flex items-center gap-1.5 text-xs font-semibold"
                  title="Ekspor Word"
                >
                  <Download className="h-3.5 w-3.5 text-blue-500" />
                  <span className="hidden xs:inline">Word</span>
                </Button>
              </div>

              {/* Compile Button */}
              <Button
                size="sm"
                onClick={() => {
                  setNewTitle("");
                  setShowCompileModal(true);
                }}
                className="h-9 px-4 bg-primary text-primary-foreground shadow-md hover:bg-primary/90 font-bold text-xs flex items-center gap-1.5 shrink-0"
              >
                <span>Kompilasi</span>
                <ListRestart className="h-4 w-4 text-yellow-300" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
