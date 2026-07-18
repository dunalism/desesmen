import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { ExamAttemptItem } from "./types";
import { formatDuration } from "@/lib/utils";

interface ExamResultsTableProps {
  attempts: ExamAttemptItem[];
  hasEssayQuestions: boolean;
  onPeriksaEsai: (attempt: ExamAttemptItem) => void;
}

export function ExamResultsTable({
  attempts,
  hasEssayQuestions,
  onPeriksaEsai,
}: ExamResultsTableProps) {
  // Format durasi pengerjaan siswa

  // Format tanggal display
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lembar Jawaban & Hasil Siswa</CardTitle>
        <CardDescription>
          Rincian nilai siswa yang telah mensubmit lembar pengerjaan CBT.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {attempts.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            Belum ada siswa yang mengirimkan lembar jawaban.
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-muted">
              <TableRow>
                <TableHead className="w-[120px]">Absen / ID</TableHead>
                <TableHead>Nama Lengkap</TableHead>
                <TableHead>Mulai</TableHead>
                <TableHead>Selesai</TableHead>
                <TableHead>Durasi</TableHead>
                <TableHead className="text-right">Skor</TableHead>
                {hasEssayQuestions && (
                  <TableHead className="text-right">Aksi</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {attempts.map((attempt) => (
                <TableRow className="even:bg-muted" key={attempt.id}>
                  <TableCell className="font-mono text-xs">
                    {attempt.studentId || "-"}
                  </TableCell>
                  <TableCell className="font-semibold">
                    {attempt.studentName}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {attempt.startedAt
                      ? formatDateDisplay(attempt.startedAt)
                      : "-"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {attempt.submittedAt
                      ? formatDateDisplay(attempt.submittedAt)
                      : "-"}
                  </TableCell>
                  <TableCell className="text-xs">
                    {formatDuration(attempt.durationSeconds)}
                  </TableCell>
                  <TableCell className="text-right">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        attempt.score !== null && attempt.score >= 75
                          ? "bg-emerald-500/10 text-emerald-500"
                          : attempt.score !== null && attempt.score >= 50
                            ? "bg-amber-500/10 text-amber-500"
                            : "bg-rose-500/10 text-rose-500"
                      }`}
                    >
                      {attempt.score !== null ? attempt.score : "Belum Dinilai"}
                    </span>
                  </TableCell>
                  {hasEssayQuestions && (
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() => onPeriksaEsai(attempt)}
                      >
                        Periksa Esai
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
