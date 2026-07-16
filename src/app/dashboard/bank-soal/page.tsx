"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import {
  Loader2,
  AlertCircle,
  ChevronRight,
  Search,
  X,
  Filter,
  BookOpenCheck,
} from "lucide-react";
import { useDialog } from "@/components/ui/dialog-provider";
import { Button } from "@/components/ui/button";
import { AssessmentCard } from "@/components/dashboard/AssessmentCard";
import { Assessment } from "@/lib/types";
import useSWRInfinite from "swr/infinite";
import { fetcher } from "@/lib/fetcher";
import { AssessmentCardSkeleton } from "@/components/dashboard/AssessmentCardSkeleton";

export default function BankSoalPage() {
  const router = useRouter();
  const { showAlert, showConfirm } = useDialog();

  const [userId, setUserId] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState("");
  const [selectedType, setSelectedType] = useState("");

  const observerRef = useRef<IntersectionObserver | null>(null);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // SWR Caching Client-Side with Infinite Scroll
  interface SWRPageData {
    success: boolean;
    assessments: Assessment[];
    hasMore: boolean;
  }

  const getKey = (pageIndex: number, previousPageData: SWRPageData | null) => {
    if (!userId) return null;
    if (previousPageData && !previousPageData.assessments.length) return null;

    const queryParams = new URLSearchParams({
      userId: userId,
      page: (pageIndex + 1).toString(),
      limit: "6",
    });

    if (debouncedSearch) queryParams.append("search", debouncedSearch);
    if (selectedDifficulty)
      queryParams.append("difficulty", selectedDifficulty);
    if (selectedType) queryParams.append("questionType", selectedType);

    return `/api/assessments?${queryParams.toString()}`;
  };

  const { data, size, setSize, isValidating, isLoading, mutate } =
    useSWRInfinite(getKey, fetcher);

  const assessments: Assessment[] = data
    ? data.flatMap((page) => page.assessments)
    : [];
  const hasMore = data ? data[data.length - 1]?.hasMore : false;
  const loading = isLoading;
  const loadingMore = isValidating && size > 1;

  // Monitor auth status & trigger initial fetch
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUserId(currentUser.uid);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Fetch more assessments on scroll
  const fetchMoreAssessments = useCallback(() => {
    if (!userId || isValidating || !hasMore) return;
    setSize((prevSize) => prevSize + 1);
  }, [userId, isValidating, hasMore, setSize]);

  // Sentinel ref for infinite scroll
  const sentinelRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (loading || loadingMore) return;
      if (observerRef.current) observerRef.current.disconnect();

      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          fetchMoreAssessments();
        }
      });

      if (node) observerRef.current.observe(node);
    },
    [loading, loadingMore, hasMore, fetchMoreAssessments],
  );

  // Delete entire assessment
  const handleDeleteAssessment = async (id: string) => {
    showConfirm(
      "Hapus Paket Soal",
      "Apakah Anda yakin ingin menghapus seluruh paket soal ini? Semua butir soal di dalamnya akan dihapus permanen.",
      async () => {
        try {
          const response = await fetch(`/api/assessments/${id}`, {
            method: "DELETE",
          });

          if (response.ok) {
            // Optimistic update of local SWR cache
            if (data) {
              mutate(
                data.map((page) => ({
                  ...page,
                  assessments: page.assessments.filter(
                    (item: Assessment) => item.id !== id,
                  ),
                })),
                false,
              );
            }
            showAlert("Sukses", "Paket soal berhasil dihapus!");
          } else {
            const data = await response.json();
            showAlert("Gagal", data.error || "Gagal menghapus paket soal.");
          }
        } catch (error) {
          console.error("Delete error:", error);
          showAlert(
            "Error Koneksi",
            "Terjadi kesalahan koneksi saat menghapus paket soal.",
          );
        }
      },
    );
  };

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedDifficulty("");
    setSelectedType("");
  };

  const isFiltered = searchQuery || selectedDifficulty || selectedType;

  if (authLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm font-semibold text-muted-foreground">
          Memverifikasi Autentikasi...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2.5 rounded-lg text-primary">
            <BookOpenCheck className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Bank Soal</h2>
            <p className="text-sm text-muted-foreground">
              Daftar Paket Soal yang telah Anda buat.
            </p>
          </div>
        </div>
        <Button
          onClick={() => router.push("/dashboard/generate")}
          className="flex items-center gap-2"
        >
          <span>Buat Soal Baru</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-muted/30 p-4 rounded-xl border border-muted flex flex-col md:flex-row gap-3 items-stretch md:items-center">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Cari kata kunci materi atau butir soal (misal: 'oksigen')..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-muted text-muted-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-col sm:flex-row gap-2">
          {/* Tipe Soal Dropdown */}
          <div className="relative">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="appearance-none bg-background border px-3 pr-8 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-all cursor-pointer min-w-[140px]"
            >
              <option value="">Semua Tipe</option>
              <option value="MULTIPLE_CHOICE">Pilihan Ganda</option>
              <option value="TRUE_FALSE">Benar/Salah</option>
              <option value="SHORT_ANSWER">Uraian/Esai</option>
              <option value="MATCHING">Menjodohkan</option>
            </select>
            <Filter className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
          </div>

          {/* Kesulitan Dropdown */}
          <div className="relative">
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="appearance-none bg-background border px-3 pr-8 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-all cursor-pointer min-w-[140px]"
            >
              <option value="">Semua Kesulitan</option>
              <option value="EASY">Mudah</option>
              <option value="MEDIUM">Sedang</option>
              <option value="HARD">HOTS / Sulit</option>
            </select>
            <Filter className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
          </div>

          {/* Reset Filter Button */}
          {isFiltered && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="text-muted-foreground hover:text-foreground h-9"
            >
              Reset
            </Button>
          )}
        </div>
      </div>
      {/* Grid of assessments */}
      {loading && assessments.length === 0 ? (
        /* SKELETON STATE: Membuka container grid dan merender 6 buah skeleton card tiruan */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <AssessmentCardSkeleton key={i} />
          ))}
        </div>
      ) : assessments.length === 0 ? (
        <div className="border border-dashed rounded-xl py-16 px-4 text-center space-y-4 bg-muted/10">
          <div className="mx-auto bg-muted w-12 h-12 rounded-full flex items-center justify-center">
            <AlertCircle className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-foreground">
              {isFiltered
                ? "Tidak ada hasil pencarian"
                : "Belum ada Paket Soal tersimpan"}
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              {isFiltered
                ? "Cobalah untuk mengubah kriteria pencarian atau menyetel ulang filter."
                : "Silakan buat paket soal/asesmen baru melalui menu Dashboard."}
            </p>
          </div>
          {isFiltered ? (
            <Button onClick={resetFilters} variant="outline" className="mt-2">
              Setel Ulang Filter
            </Button>
          ) : (
            <Button
              onClick={() => router.push("/dashboard/generate")}
              variant="outline"
              className="mt-2"
            >
              Mulai Generator AI
            </Button>
          )}
        </div>
      ) : (
        /* DATA STATE: Tampilan asli ketika data sukses ter-fetch */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {assessments.map((assessment) => (
            <AssessmentCard
              key={assessment.id}
              assessment={assessment}
              debouncedSearch={debouncedSearch}
              selectedType={selectedType}
              onDelete={handleDeleteAssessment}
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
                Memuat paket soal berikutnya...
              </p>
            </>
          )}
        </div>
      )}

      {/* End of content indicator */}
      {!hasMore && assessments.length > 0 && (
        <div className="text-center py-8 text-xs font-medium text-muted-foreground border-t">
          Semua paket soal Anda telah berhasil dimuat.
        </div>
      )}
    </div>
  );
}
