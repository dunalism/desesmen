"use client";

import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

export default function CbtSuccessPage() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 px-4 py-12 dark:bg-background">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="flex flex-col items-center">
          <div className="inline-flex size-16 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400 shadow-sm animate-bounce">
            <CheckCircle className="h-10 w-10" />
          </div>
          <h1 className="mt-5 font-heading text-2xl font-bold tracking-tight text-foreground">
            Ujian Berhasil Dikirim!
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            Terima kasih, lembar pengerjaan Anda telah tersimpan dengan aman di
            server.
          </p>
        </div>

        <Card className="border shadow-lg">
          <CardHeader className="pb-3 text-center">
            <CardTitle className="text-lg">Sesi Selesai</CardTitle>
            <CardDescription>
              Silakan tutup jendela browser ini atau kembali ke halaman login
              CBT.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4 text-xs text-left text-muted-foreground space-y-2">
              <p className="font-bold text-foreground text-sm">
                💡 Apa yang terjadi selanjutnya?
              </p>
              <p>
                1. Hasil ujian Anda akan diperiksa dan dinilai secara otomatis
                oleh server.
              </p>
              <p>
                2. Guru Anda dapat mengakses lembar jawaban dan memberikan rekap
                nilai.
              </p>
              <p>
                3. Jika fitur Leaderboard diaktifkan oleh Guru, Anda dapat
                melihat papan peringkat setelah waktu pengerjaan berakhir.
              </p>
            </div>

            <Button
              onClick={() => router.push("/cbt")}
              className="w-full mt-4 h-10 font-semibold"
            >
              Kembali ke Login CBT
            </Button>
          </CardContent>
        </Card>

        <div className="text-xs text-muted-foreground">
          Sistem Ujian Sekolah Online &bull; Jujur, Adil, Berprestasi!
        </div>
      </div>
    </div>
  );
}
