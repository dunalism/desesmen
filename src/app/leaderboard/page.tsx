"use client";

import useSWR from "swr";
import Link from "next/link";
import { fetcher } from "@/lib/fetcher";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Trophy,
  Calendar,
  Users,
  ArrowLeft,
  Search,
  BookOpenCheck,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";

interface LeaderboardExam {
  id: string;
  title: string;
  token: string;
  duration: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
  showLeaderboard: boolean;
  assessment: {
    questionCount: number;
  };
  _count: {
    attempts: number;
  };
}

export default function LeaderboardListPage() {
  const {
    data: exams,
    error,
    isLoading,
  } = useSWR<LeaderboardExam[]>("/api/leaderboards", fetcher);

  const [search, setSearch] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  const filteredExams = exams?.filter(
    (exam) =>
      exam.title.toLowerCase().includes(search.toLowerCase()) ||
      exam.token.toLowerCase().includes(search.toLowerCase()),
  );

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        setUser(null);
      } else {
        setUser(currentUser);
      }
    });

    return () => unsubscribe();
  }, [router]);

  function handleBack() {
    if (user) {
      router.push("dashboard/exams");
    } else {
      router.push("/login");
    }
  }

  return (
    <div className="min-h-screen bg-muted/40 dark:bg-background py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Button
                onClick={() => handleBack()}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <ArrowLeft className="size-4" /> Kembali
              </Button>
            </div>
            <h1 className="text-3xl font-bold tracking-tight font-heading mt-2 flex items-center gap-3">
              <Trophy className="size-8 text-amber-500 fill-amber-500/10" />
              Papan Peringkat Publik
            </h1>
            <p className="text-muted-foreground text-sm">
              Lihat hasil perjuangan belajar siswa pada sesi ujian yang telah
              diselesaikan.
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Cari ujian atau token..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <Card key={n} className="animate-pulse">
                <CardHeader className="h-28 bg-muted/50 rounded-t-xl" />
                <CardContent className="space-y-3 p-6">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                  <div className="h-8 bg-muted rounded w-full mt-4" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : error ? (
          <Card className="border-destructive bg-destructive/5 text-center p-8">
            <p className="text-destructive font-medium">
              Gagal memuat daftar papan peringkat.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Silakan coba segarkan halaman.
            </p>
          </Card>
        ) : !filteredExams || filteredExams.length === 0 ? (
          <Card className="flex flex-col items-center justify-center text-center p-12 border-dashed">
            <div className="size-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Trophy className="size-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg">
              Belum ada papan peringkat tersedia
            </h3>
            <p className="text-muted-foreground text-sm max-w-sm mt-1">
              {search
                ? "Tidak ada hasil yang cocok dengan kata kunci pencarian Anda."
                : "Saat ini belum ada sesi ujian yang ditutup atau diizinkan memiliki papan peringkat."}
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredExams.map((exam) => (
              <Card
                key={exam.id}
                className="hover:shadow-lg transition-shadow border-muted flex flex-col justify-between"
              >
                <div>
                  <CardHeader className="relative">
                    <div className="absolute right-6 top-6 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono font-bold tracking-wider rounded-lg px-2.5 py-1 text-xs border border-amber-500/20">
                      {exam.token}
                    </div>
                    <CardTitle className="line-clamp-2 pr-16 text-lg font-bold">
                      {exam.title}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-1.5 mt-1.5">
                      <Calendar className="size-3.5" />
                      Selesai pada {formatDate(exam.endTime)}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4 pt-0">
                    <div className="grid grid-cols-2 gap-3 text-sm border-t border-b py-3">
                      <div className="space-y-0.5">
                        <span className="text-xs text-muted-foreground">
                          Jumlah Soal
                        </span>
                        <div className="font-semibold flex items-center gap-1.5">
                          <BookOpenCheck className="size-4 text-primary" />
                          {exam.assessment?.questionCount || 0} Soal
                        </div>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-xs text-muted-foreground">
                          Peserta Submit
                        </span>
                        <div className="font-semibold flex items-center gap-1.5">
                          <Users className="size-4 text-primary" />
                          {exam._count?.attempts || 0} Siswa
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </div>

                <div className="p-6 pt-0">
                  <Link href={`/leaderboard/${exam.token}`} passHref>
                    <Button className="w-full gap-2 font-semibold">
                      <Trophy className="size-4" /> Lihat Papan Peringkat
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
