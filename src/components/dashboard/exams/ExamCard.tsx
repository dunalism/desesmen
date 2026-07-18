"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Clipboard,
  Check,
  Trash2,
  Play,
  Square,
  Users,
  Calendar,
  Clock,
  Shuffle,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Assessment, ExamItem } from "@/lib/types";

interface ExamCardProps {
  exam: ExamItem;
  assessment: Assessment[];
  onToggleActive: (id: string, currentStatus: boolean) => void;
  onDelete: (id: string, title: string) => void;
}

export function ExamCard({
  exam,
  assessment,
  onToggleActive,
  onDelete,
}: ExamCardProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  // Handler copy token ke clipboard
  const handleCopyToken = async () => {
    try {
      await navigator.clipboard.writeText(exam.token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Gagal menyalin token:", err);
    }
  };

  // Membantu format tampilan tanggal
  const formatDateDisplay = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Cek apakah ujian saat ini masih berlaku secara waktu
  const getExamStatus = () => {
    const now = new Date().getTime();
    const start = new Date(exam.startTime).getTime();
    const end = new Date(exam.endTime).getTime();

    if (!exam.isActive) {
      return { label: "Ditutup", variant: "destructive" as const };
    }
    if (now < start) {
      return { label: "Akan Datang", variant: "secondary" as const };
    }
    if (now > end) {
      return { label: "Selesai", variant: "outline" as const };
    }
    return { label: "Sedang Aktif", variant: "default" as const };
  };

  const status = getExamStatus();

  return (
    <Card className="flex flex-col justify-between hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-center justify-between mb-2">
          <Button
            variant={status.variant}
            size="xs"
            disabled
            className="pointer-events-none"
          >
            {status.label}
          </Button>
          <div className="flex gap-2">
            {/* Tutup / Buka Ujian Button */}
            {exam.isActive && status.label === "Sedang Aktif" ? (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => onToggleActive(exam.id, true)}
                title="Tutup Ujian"
              >
                <Square className="h-4 w-4" />
              </Button>
            ) : (
              !exam.isActive && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => onToggleActive(exam.id, false)}
                  title="Aktifkan Kembali Ujian"
                >
                  <Play className="h-4 w-4" />
                </Button>
              )
            )}

            {/* Hapus Button */}
            <Button
              variant="destructive"
              size="icon-sm"
              onClick={() => onDelete(exam.id, exam.title)}
              title="Hapus Sesi Ujian"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <CardTitle className="leading-snug">{exam.title}</CardTitle>
        <CardDescription>
          Paket: {exam.assessment.title || "Tanpa Judul"} (
          {assessment.map(
            (a) => a.id === exam.assessmentId && a._count?.questions,
          )}{" "}
          Soal)
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* TOKEN BOX */}
        <div className="rounded-lg bg-muted p-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Token Akses Siswa
            </p>
            <p className="text-2xl font-black tracking-wider font-mono text-primary">
              {exam.token}
            </p>
          </div>
          <Button
            variant={copied ? "secondary" : "outline"}
            size="sm"
            onClick={handleCopyToken}
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5" />
                Tersalin
              </>
            ) : (
              <>
                <Clipboard className="h-3.5 w-3.5" />
                Salin
              </>
            )}
          </Button>
        </div>

        {/* METRICS & CONFIG */}
        <div className="space-y-2 text-xs text-muted-foreground pt-2">
          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <span>
              Durasi: <strong>{exam.duration} Menit</strong>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Mulai: {formatDateDisplay(exam.startTime)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Selesai: {formatDateDisplay(exam.endTime)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            <span>
              Siswa Submit: <strong>{exam._count.attempts} Siswa</strong>
            </span>
          </div>

          {/* Shuffling Indicators */}
          <div className="flex flex-wrap gap-1.5 pt-2">
            {exam.shuffleQuestions && (
              <span className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-[10px] font-medium text-foreground">
                <Shuffle className="h-2.5 w-2.5" /> Soal Diacak
              </span>
            )}
            {exam.shuffleOptions && (
              <span className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-[10px] font-medium text-foreground">
                <Shuffle className="h-2.5 w-2.5" /> Opsi Diacak
              </span>
            )}
            {exam.showLeaderboard && (
              <span className="inline-flex items-center gap-1 rounded bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                🏆 Leaderboard Publik
              </span>
            )}
          </div>
        </div>
      </CardContent>

      <CardFooter className="bg-transparent">
        <Button
          variant="secondary"
          className="w-full"
          onClick={() => router.push(`/dashboard/exams/${exam.id}/results`)}
        >
          <Eye className="mr-2 h-4 w-4" /> Lihat Hasil & Rekap Nilai
        </Button>
      </CardFooter>
    </Card>
  );
}
