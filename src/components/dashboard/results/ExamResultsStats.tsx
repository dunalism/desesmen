import { Card } from "@/components/ui/card";
import { Award, Users, TrendingUp, TrendingDown } from "lucide-react";
import { StatsSummary } from "./types";

interface ExamResultsStatsProps {
  stats?: StatsSummary;
}

export function ExamResultsStats({ stats }: ExamResultsStatsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card className="flex items-center gap-4 p-5">
        <div className="rounded-full bg-primary/10 p-3 text-primary">
          <TrendingUp className="h-6 w-6" />
        </div>
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase">
            Rata-Rata Nilai
          </p>
          <p className="text-2xl font-black">{stats?.averageScore ?? 0}</p>
        </div>
      </Card>

      <Card className="flex items-center gap-4 p-5">
        <div className="rounded-full bg-emerald-500/10 p-3 text-emerald-500">
          <Award className="h-6 w-6" />
        </div>
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase">
            Nilai Tertinggi
          </p>
          <p className="text-2xl font-black">{stats?.maxScore ?? 0}</p>
        </div>
      </Card>

      <Card className="flex items-center gap-4 p-5">
        <div className="rounded-full bg-rose-500/10 p-3 text-rose-500">
          <TrendingDown className="h-6 w-6" />
        </div>
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase">
            Nilai Terendah
          </p>
          <p className="text-2xl font-black">{stats?.minScore ?? 0}</p>
        </div>
      </Card>

      <Card className="flex items-center gap-4 p-5">
        <div className="rounded-full bg-blue-500/10 p-3 text-blue-500">
          <Users className="h-6 w-6" />
        </div>
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase">
            Siswa Mengerjakan
          </p>
          <p className="text-2xl font-black">
            {stats?.totalAttempts ?? 0}{" "}
            <span className="text-xs text-muted-foreground">Siswa</span>
          </p>
        </div>
      </Card>
    </div>
  );
}
