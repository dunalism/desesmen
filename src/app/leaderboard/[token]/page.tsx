"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { useParams } from "next/navigation";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Trophy,
  Clock,
  ArrowLeft,
  Crown,
  Medal,
  Award,
  BookOpen,
} from "lucide-react";
import { formatDuration } from "@/lib/utils";

// @ts-expect-error canvas-confetti does not provide types in this offline build
import confetti from "canvas-confetti";

interface Attempt {
  id: string;
  studentName: string;
  studentId: string | null;
  score: number | null;
  durationSeconds: number;
  startedAt: string;
  submittedAt: string | null;
}

interface LeaderboardResponse {
  exam: {
    id: string;
    title: string;
    token: string;
    duration: number;
    startTime: string;
    endTime: string;
    questionCount: number;
  };
  attempts: Attempt[];
}

export default function LeaderboardDetailPage() {
  const params = useParams();
  const token = params?.token as string;

  const { data, error, isLoading } = useSWR<LeaderboardResponse>(
    token ? `/api/leaderboards/${token}` : null,
    fetcher,
  );

  const [cooldown, setCooldown] = useState(false);

  const handleConfetti = () => {
    if (cooldown) return;
    setCooldown(true);

    // Jalankan confetti dari dua arah (kiri dan kanan) selama 2.5 detik
    const duration = 2.5 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 50 };

    const randomInRange = (min: number, max: number) => {
      return Math.random() * (max - min) + min;
    };

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        clearInterval(interval);
        return;
      }

      const particleCount = 50 * (timeLeft / duration);

      // Confetti dari sisi kiri
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      });
      // Confetti dari sisi kanan
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      });
    }, 250);

    // Cooldown selama 4 detik sebelum bisa diklik lagi
    setTimeout(() => {
      setCooldown(false);
    }, 4000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/40 dark:bg-background flex flex-col items-center justify-center p-4">
        <Trophy className="size-12 text-amber-500 animate-bounce mb-4" />
        <p className="text-muted-foreground animate-pulse text-sm">
          Memuat data papan peringkat...
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-muted/40 dark:bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-destructive bg-destructive/5 p-6 text-center">
          <Trophy className="size-12 text-destructive mx-auto mb-4" />
          <h3 className="font-bold text-lg text-destructive">
            Gagal Memuat Halaman
          </h3>
          <p className="text-sm text-muted-foreground mt-2">
            {error?.message ||
              "Sesi ujian mungkin belum berakhir atau ditonaktifkan."}
          </p>
          <div className="mt-6">
            <Link href="/leaderboard" passHref>
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="size-4" /> Kembali ke Daftar
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const { exam, attempts } = data;

  // Bagi data untuk Podium (3 Besar) dan Tabel (Peringkat 4 dst)
  const top3 = attempts.slice(0, 3);
  const remaining = attempts.slice(3);

  return (
    <div className="min-h-screen bg-muted/40 dark:bg-background py-8 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* CSS Keyframes Animations */}
      <style>{`
        @keyframes riseUp {
          from {
            opacity: 0;
            transform: translateY(40px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes floatCard {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-6px);
          }
        }
        @keyframes floatCrown {
          0%, 100% {
            transform: translateY(0) rotate(-2deg) scale(1);
          }
          50% {
            transform: translateY(-4px) rotate(2deg) scale(1.05);
          }
        }
        @keyframes glowAmber {
          0%, 100% {
            box-shadow: 0 10px 25px -5px rgba(245, 158, 11, 0.15), 0 8px 10px -6px rgba(245, 158, 11, 0.15);
          }
          50% {
            box-shadow: 0 20px 35px -5px rgba(245, 158, 11, 0.35), 0 12px 18px -6px rgba(245, 158, 11, 0.35);
          }
        }
        .animate-rise-3 {
          animation: riseUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          opacity: 0;
        }
        .animate-rise-2 {
          animation: riseUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          animation-delay: 150ms;
          opacity: 0;
        }
        .animate-rise-1 {
          animation: riseUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          animation-delay: 300ms;
          opacity: 0;
        }
        .animate-float-card {
          animation: floatCard 2.5s ease-in-out infinite;
        }
        .animate-float-crown {
          animation: floatCrown 2s ease-in-out infinite;
        }
        .animate-glow-amber {
          animation: glowAmber 3s ease-in-out infinite;
        }
      `}</style>

      {/* Background Trophy Decoration */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] sm:w-[500px] aspect-square pointer-events-none z-0 flex items-center justify-center">
        <Trophy
          className="w-full h-full text-amber-500/5 dark:text-amber-500/[0.03]"
          style={{ pointerEvents: "none" }}
        />
      </div>

      <div className="max-w-5xl mx-auto space-y-8 relative z-10">
        {/* Header Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-6">
          <div className="space-y-1">
            <Link href="/leaderboard" passHref>
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 -ml-2 text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="size-4" /> Daftar Papan Peringkat
              </Button>
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight font-heading mt-2">
              {exam.title}
            </h1>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-muted-foreground mt-1">
              <span className="flex items-center gap-1">
                <span className="font-semibold text-foreground">Token:</span>{" "}
                {exam.token}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <BookOpen className="size-4" /> {exam.questionCount} Soal
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="size-4" /> {exam.duration} Menit
              </span>
            </div>
          </div>
        </div>

        {attempts.length === 0 ? (
          <Card className="flex flex-col items-center justify-center text-center p-12 border-dashed">
            <div className="size-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Award className="size-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg">Belum ada peserta</h3>
            <p className="text-muted-foreground text-sm max-w-sm mt-1">
              Sesi ujian ini telah ditutup, namun tidak ada siswa yang
              mengirimkan lembar jawaban.
            </p>
          </Card>
        ) : (
          <>
            {/* Podium Section */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-center font-heading flex items-center justify-center gap-2">
                <Crown className="size-6 text-amber-500 fill-amber-500/10" />
                Juara 3 Besar
              </h2>

              <div className="grid grid-cols-3 gap-3 sm:gap-6 max-w-2xl mx-auto pt-8 items-end">
                {/* Visual Podium Render */}

                {/* 1. Perak (Juara 2) */}
                {top3[1] ? (
                  <div className="flex flex-col items-center animate-rise-2 transition-all duration-300 hover:scale-105 active:scale-95">
                    {/* Siswa Card Info */}
                    <div className="text-center mb-3 space-y-1 w-full px-1">
                      <div className="relative inline-flex">
                        <div className="size-12 rounded-full bg-slate-400/20 border-2 border-slate-400 flex items-center justify-center shadow-md shadow-slate-400/10">
                          <Medal className="size-6 text-slate-500" />
                        </div>
                        <span className="absolute -bottom-1 -right-1 size-5 bg-slate-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center border border-background">
                          2
                        </span>
                      </div>
                      <p
                        className="font-bold text-xs sm:text-sm truncate text-foreground/90"
                        title={top3[1].studentName}
                      >
                        {top3[1].studentName}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        ID: {top3[1].studentId || "-"}
                      </p>
                    </div>
                    {/* Blok Podium */}
                    <div className="w-full bg-gradient-to-t from-slate-400/20 to-slate-400/10 border-t-2 border-x border-slate-400 rounded-t-lg h-24 sm:h-32 flex flex-col items-center justify-center p-2 text-center shadow-md shadow-slate-400/5">
                      <span className="text-2xl sm:text-3xl font-black text-slate-500/60 font-mono">
                        {top3[1].score !== null ? Math.round(top3[1].score) : 0}
                      </span>
                      <span className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <Clock className="size-3" />{" "}
                        {formatDuration(top3[1].durationSeconds)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="h-10" /> // Spacer kosong jika tidak ada juara 2
                )}

                {/* 2. Emas (Juara 1) */}
                {top3[0] ? (
                  <div className="flex flex-col items-center animate-rise-1 animate-float-card animate-glow-amber transition-all duration-300 hover:scale-105 active:scale-95 z-10">
                    {/* Siswa Card Info */}
                    <div className="text-center mb-3 space-y-1 w-full px-1">
                      <div className="relative inline-flex scale-110">
                        <button
                          type="button"
                          onClick={handleConfetti}
                          disabled={cooldown}
                          className="size-12 rounded-full bg-amber-500/20 border-2 border-amber-500 flex items-center justify-center cursor-pointer hover:bg-amber-500/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 disabled:opacity-80"
                          title="Klik untuk merayakan kemenangan 🎉"
                          aria-label="Klik mahkota juara pertama untuk merayakan kemenangan"
                        >
                          <Crown className="size-6 text-amber-500 fill-amber-500/20 animate-float-crown" />
                        </button>
                        <span className="absolute -bottom-1 -right-1 size-5 bg-amber-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center border border-background">
                          1
                        </span>
                      </div>
                      <p
                        className="font-extrabold text-sm sm:text-base text-amber-600 dark:text-amber-400 truncate mt-1"
                        title={top3[0].studentName}
                      >
                        {top3[0].studentName}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        ID: {top3[0].studentId || "-"}
                      </p>
                    </div>
                    {/* Blok Podium */}
                    <div className="w-full bg-gradient-to-t from-amber-500/20 to-amber-500/10 border-t-4 border-x border-amber-500 rounded-t-lg h-32 sm:h-44 flex flex-col items-center justify-center p-2 text-center shadow-lg shadow-amber-500/10">
                      <span className="text-3xl sm:text-4xl font-black text-amber-500/80 font-mono">
                        {top3[0].score !== null ? Math.round(top3[0].score) : 0}
                      </span>
                      <span className="text-[10px] sm:text-xs text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1 mt-1">
                        <Clock className="size-3" />{" "}
                        {formatDuration(top3[0].durationSeconds)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="h-10" />
                )}

                {/* 3. Perunggu (Juara 3) */}
                {top3[2] ? (
                  <div className="flex flex-col items-center animate-rise-3 transition-all duration-300 hover:scale-105 active:scale-95">
                    {/* Siswa Card Info */}
                    <div className="text-center mb-3 space-y-1 w-full px-1">
                      <div className="relative inline-flex">
                        <div className="size-12 rounded-full bg-orange-600/20 border-2 border-orange-600 flex items-center justify-center shadow-sm shadow-orange-600/5">
                          <Medal className="size-6 text-orange-700" />
                        </div>
                        <span className="absolute -bottom-1 -right-1 size-5 bg-orange-700 text-white rounded-full text-[10px] font-bold flex items-center justify-center border border-background">
                          3
                        </span>
                      </div>
                      <p
                        className="font-bold text-xs sm:text-sm truncate text-foreground/90"
                        title={top3[2].studentName}
                      >
                        {top3[2].studentName}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        ID: {top3[2].studentId || "-"}
                      </p>
                    </div>
                    {/* Blok Podium */}
                    <div className="w-full bg-gradient-to-t from-orange-600/20 to-orange-600/10 border-t-2 border-x border-orange-600 rounded-t-lg h-20 sm:h-24 flex flex-col items-center justify-center p-2 text-center shadow-sm shadow-orange-600/5">
                      <span className="text-2xl sm:text-3xl font-black text-orange-700/60 font-mono">
                        {top3[2].score !== null ? Math.round(top3[2].score) : 0}
                      </span>
                      <span className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <Clock className="size-3" />{" "}
                        {formatDuration(top3[2].durationSeconds)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="h-10" />
                )}
              </div>
            </div>

            {/* Remaining Students Table (Rank 4+) */}
            {remaining.length > 0 && (
              <Card className="border relative z-10 bg-background/80 backdrop-blur-sm">
                <CardHeader className="bg-muted/10">
                  <CardTitle className="text-lg font-heading">
                    Peringkat Susulan
                  </CardTitle>
                  <CardDescription>
                    Siswa dengan peringkat ke-4 dan seterusnya.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-20 text-center font-bold">
                          Peringkat
                        </TableHead>
                        <TableHead>Nama Siswa</TableHead>
                        <TableHead>No Absen / ID</TableHead>
                        <TableHead className="text-center">
                          Durasi Pengerjaan
                        </TableHead>
                        <TableHead className="text-right font-bold pr-6">
                          Skor Akhir
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {remaining.map((attempt, index) => {
                        const rank = index + 4;
                        return (
                          <TableRow
                            key={attempt.id}
                            className="even:bg-muted/30"
                          >
                            <TableCell className="text-center font-mono font-bold text-muted-foreground">
                              #{rank}
                            </TableCell>
                            <TableCell className="font-semibold">
                              {attempt.studentName}
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {attempt.studentId || "-"}
                            </TableCell>
                            <TableCell className="text-center">
                              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock className="size-3" />
                                {formatDuration(attempt.durationSeconds)}
                              </span>
                            </TableCell>
                            <TableCell className="text-right font-mono font-bold pr-6 text-sm">
                              {attempt.score !== null
                                ? Math.round(attempt.score)
                                : 0}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
