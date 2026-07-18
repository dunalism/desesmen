"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useDialog } from "@/components/ui/dialog-provider";

export default function CbtLoginPage() {
  const router = useRouter();
  const { showAlert } = useDialog();
  const [name, setName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);

  const handleStartExam = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || name.trim().length < 3) {
      showAlert(
        "Validasi Gagal",
        "Nama Lengkap harus diisi minimal 3 karakter.",
      );
      return;
    }

    if (!studentId.trim()) {
      showAlert("Validasi Gagal", "Nomor Absen / ID Siswa harus diisi.");
      return;
    }

    const cleanToken = token.trim().toUpperCase();
    if (!cleanToken) {
      showAlert("Validasi Gagal", "Token Ujian harus diisi.");
      return;
    }

    setLoading(true);

    try {
      // Fetch static questions JSON
      const res = await fetch(`/api/exams/${cleanToken}/questions`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Gagal mengunduh soal ujian.");
      }

      // Simpan session siswa ke localStorage
      localStorage.setItem(
        `cbt-student-session-${cleanToken}`,
        JSON.stringify({
          name: name.trim(),
          studentId: studentId.trim(),
          token: cleanToken,
          startedAt: btoa(new Date().toString()),
        }),
      );

      // Simpan data ujian (soal dkk) ke localStorage
      localStorage.setItem(`cbt-exam-data-${cleanToken}`, JSON.stringify(data));

      // Arahkan ke halaman pengerjaan
      router.push(`/cbt/${cleanToken}`);
    } catch (err: unknown) {
      console.error(err);
      const errMsg = err instanceof Error ? err.message : "Terjadi kesalahan.";
      showAlert(
        "Gagal Masuk Ujian",
        errMsg || "Pastikan Token Ujian benar dan sesi ujian masih aktif.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 px-4 py-12 dark:bg-background">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center text-center">
          <div className="inline-flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground font-mono font-bold text-2xl shadow-md">
            CBT
          </div>
          <h1 className="mt-4 font-heading text-2xl font-bold tracking-tight">
            Computer Based Test (CBT)
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Silakan masukkan identitas diri dan Token Ujian Anda
          </p>
        </div>

        <Card className="border shadow-lg">
          <CardHeader>
            <CardTitle>Lembar Masuk Ujian</CardTitle>
            <CardDescription>
              Pastikan data yang Anda masukkan sudah benar sebelum menekan
              tombol Mulai.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleStartExam} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Nama Lengkap
                </label>
                <Input
                  type="text"
                  placeholder="Contoh: Budi Santoso"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Nomor Absen / ID Siswa
                </label>
                <Input
                  type="text"
                  placeholder="Contoh: 12 atau NISN-098"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Token Ujian
                </label>
                <Input
                  type="text"
                  placeholder="Contoh: MAT-7X2"
                  className="font-mono uppercase text-center tracking-widest text-lg h-10"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full mt-6 h-10 text-base font-semibold"
                disabled={loading}
              >
                {loading
                  ? "Sedang Mempersiapkan Ujian..."
                  : "Mulai Ujian Sekarang"}
              </Button>
            </form>
            <Button
              onClick={() => router.push("/leaderboard")}
              size="lg"
              variant="ghost"
              className="mt-2 w-full "
            >
              Lihat leaderboard
            </Button>
          </CardContent>
        </Card>

        <div className="text-center text-xs text-muted-foreground">
          Sistem Ujian Sekolah Online • Bebas Khawatir Kehilangan Jawaban
        </div>
      </div>
    </div>
  );
}
