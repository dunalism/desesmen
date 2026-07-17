"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Loader2, Clipboard, AlertTriangle, ClipboardList } from "lucide-react";
import { useDialog } from "@/components/ui/dialog-provider";
import { Button } from "@/components/ui/button";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { ExamCard } from "@/components/dashboard/exams/ExamCard";
import { CreateExamDialog } from "@/components/dashboard/exams/CreateExamDialog";
import useSWRInfinite from "swr/infinite";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { Assessment, AssessmentOption, ExamItem } from "@/lib/types";
import { ExamsSkeleton } from "@/components/dashboard/exams/ExamsSkeleton";

interface AssessmentsListResponse {
  success: boolean;
  assessments: Assessment[];
}

export default function ExamsDashboardPage() {
  const router = useRouter();
  const { showAlert, showConfirm } = useDialog();

  const [userId, setUserId] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch Paket Soal (Assessments) untuk dropdown modal
  const { data: assessmentsData } = useSWR<AssessmentsListResponse>(
    userId ? `/api/assessments?userId=${userId}&limit=100` : null,
    fetcher,
  );

  const assessments = assessmentsData?.assessments || [];

  // SWR Caching Client-Side with Infinite Scroll
  interface SWRExamsPageData {
    success: boolean;
    exams: ExamItem[];
    hasMore: boolean;
  }

  const getKey = (
    pageIndex: number,
    previousPageData: SWRExamsPageData | null,
  ) => {
    if (!userId) return null;
    if (previousPageData && !previousPageData.exams.length) return null;

    return `/api/exams?userId=${userId}&page=${pageIndex + 1}&limit=6`;
  };

  const {
    data: infiniteData,
    size,
    setSize,
    error: examsError,
    isValidating,
    isLoading: examsLoading,
    mutate: mutateExams,
  } = useSWRInfinite<SWRExamsPageData>(getKey, fetcher);

  const exams: ExamItem[] = infiniteData
    ? infiniteData.flatMap((page) => page.exams)
    : [];
  const hasMore = infiniteData
    ? infiniteData[infiniteData.length - 1]?.hasMore
    : false;
  const loadingMore = isValidating && size > 1;

  const observerRef = useRef<IntersectionObserver | null>(null);

  // Fetch more exams on scroll
  const fetchMoreExams = useCallback(() => {
    if (!userId || isValidating || !hasMore) return;
    setSize((prevSize) => prevSize + 1);
  }, [userId, isValidating, hasMore, setSize]);

  // Sentinel ref for infinite scroll
  const sentinelRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (examsLoading || loadingMore) return;
      if (observerRef.current) observerRef.current.disconnect();

      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          fetchMoreExams();
        }
      });

      if (node) observerRef.current.observe(node);
    },
    [examsLoading, loadingMore, hasMore, fetchMoreExams],
  );

  // Monitor status autentikasi
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUserId(currentUser.uid);
      } else {
        router.push("/login");
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  // Handler menonaktifkan status ujian (Tutup Ujian)
  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    const actionText = currentStatus ? "menutup" : "mengaktifkan kembali";
    showConfirm(
      "Ubah Status Sesi Ujian",
      `Apakah Anda yakin ingin ${actionText} sesi ujian ini? Siswa tidak akan bisa masuk ujian jika dinonaktifkan.`,
      async () => {
        try {
          const response = await fetch(`/api/exams/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isActive: !currentStatus }),
          });

          if (response.ok) {
            showAlert(
              "Sukses",
              `Sesi ujian berhasil ${currentStatus ? "ditutup" : "diaktifkan kembali"}!`,
            );
            mutateExams();
          } else {
            const result = await response.json();
            showAlert("Gagal", result.error || "Gagal mengubah status ujian.");
          }
        } catch (error) {
          console.error("Status toggle error:", error);
          showAlert("Error", "Terjadi kesalahan jaringan.");
        }
      },
    );
  };

  const handleDeleteExam = async (id: string, title: string) => {
    showConfirm(
      "Hapus Sesi Ujian",
      `Apakah Anda yakin ingin menghapus ujian "${title}"? Tindakan ini permanen. Seluruh lembar jawaban siswa dihapus!`,
      async () => {
        try {
          const response = await fetch(`/api/exams/${id}`, {
            method: "DELETE",
          });

          if (response.ok) {
            showAlert("Sukses", "Sesi ujian berhasil dihapus!");
            mutateExams();
          } else {
            const result = await response.json();
            showAlert("Gagal", result.error || "Gagal menghapus sesi ujian.");
          }
        } catch (error) {
          console.error("Delete exam error:", error);
          showAlert("Error", "Terjadi kesalahan jaringan.");
        }
      },
    );
  };

  if (authLoading || (examsLoading && !infiniteData)) {
    return <ExamsSkeleton />;
  }

  if (examsError) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center gap-2 p-4 text-center bg-background text-foreground">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <h3 className="text-lg font-semibold">Gagal Memuat Data</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          Terjadi kesalahan saat berkomunikasi dengan server. Silakan muat ulang
          halaman.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto w-full">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2.5 rounded-lg text-primary">
            <ClipboardList className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Sesi Ujian</h2>
            <p className="text-sm text-muted-foreground">
              Kelola ujian mandiri tangguh dengan analisis yang akurat.
            </p>
          </div>
        </div>
        <Button
          className="h-9 font-semibold"
          onClick={() => setIsModalOpen(true)}
          size="lg"
        >
          + Buat Ujian Baru
        </Button>
      </div>

      {/* DASHBOARD LIST */}
      {exams.length === 0 ? (
        <Card className="flex flex-col items-center justify-center border-dashed p-12 text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <Clipboard className="h-12 w-12 text-muted-foreground" />
          </div>
          <CardTitle className="text-lg font-semibold">
            Belum Ada Sesi Ujian
          </CardTitle>
          <CardDescription className="mt-1 max-w-md">
            Anda belum pernah membuat sesi ujian. Klik tombol di atas untuk
            mengaktifkan sesi ujian baru dari paket soal yang sudah Anda miliki.
          </CardDescription>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {exams.map((exam) => (
            <ExamCard
              assessment={assessments}
              key={exam.id}
              exam={exam}
              onToggleActive={handleToggleActive}
              onDelete={handleDeleteExam}
            />
          ))}
        </div>
      )}

      {/* Sentinel indicator for scroll down pagination */}
      {hasMore && (
        <div
          ref={sentinelRef}
          className="py-8 flex items-center justify-center gap-2"
        >
          {loadingMore && (
            <>
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <p className="text-xs font-semibold text-muted-foreground">
                Memuat sesi ujian berikutnya...
              </p>
            </>
          )}
        </div>
      )}

      {/* End of content indicator */}
      {!hasMore && exams.length > 0 && (
        <div className="text-center py-8 text-xs font-medium text-muted-foreground border-t mt-6">
          Semua sesi ujian Anda telah berhasil dimuat.
        </div>
      )}

      {/* FORM MODAL (BUAT UJIAN BARU) */}
      <CreateExamDialog
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        userId={userId || ""}
        assessments={assessments as AssessmentOption[]}
        onSuccess={(token) => {
          setIsModalOpen(false);
          showAlert(
            "Sukses",
            `Ujian CBT berhasil diaktifkan dengan Token: ${token}`,
          );
          mutateExams();
        }}
      />
    </div>
  );
}
