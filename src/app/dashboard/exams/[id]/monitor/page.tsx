/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, use, useMemo } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { collection, onSnapshot, doc, setDoc } from "firebase/firestore";
import {
  Loader2,
  ArrowLeft,
  Activity,
  Users,
  CheckCircle2,
  XOctagon,
  Clock,
  Shield,
  Search,
  Check,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useDialog } from "@/components/ui/dialog-provider";

interface StudentPulse {
  id: string;
  studentName: string;
  studentId: string;
  currentProgress: number;
  totalQuestions: number;
  violationCount: number;
  lastActive: any;
  lastActiveDate: Date;
  status: "ACTIVE" | "IDLE" | "OFFLINE" | "COMPLETED" | "SUBMIT_FAILED";
  submitError?: string | null;
  answers: any[];
  startedAt: string;
  durationSeconds: number;
}

export default function LiveMonitorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = use(params);
  const { showAlert, showConfirm } = useDialog();

  const [userId, setUserId] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [students, setStudents] = useState<StudentPulse[]>([]);
  const [loadingData, setLoadingLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const [submittingForStudent, setSubmittingForStudent] = useState<
    string | null
  >(null);

  // Monitor status autentikasi guru
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

  // Realtime clock update to compute offline durations precisely every 5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // Listen to Firestore real-time heartbeat data
  useEffect(() => {
    if (!userId) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoadingLoading(true);
    const studentsCol = collection(db, "exams", id, "students");
    const unsubscribe = onSnapshot(
      studentsCol,
      (snapshot) => {
        const list: StudentPulse[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          const lastActiveDate = data.lastActive?.toDate() || new Date();
          list.push({
            id: doc.id,
            studentName: data.studentName || "Tanpa Nama",
            studentId: data.studentId || "-",
            currentProgress: data.currentProgress || 0,
            totalQuestions: data.totalQuestions || 0,
            violationCount: data.violationCount || 0,
            lastActive: data.lastActive,
            lastActiveDate,
            status: data.status || "ACTIVE",
            submitError: data.submitError || null,
            answers: data.answers || [],
            startedAt: data.startedAt || new Date().toISOString(),
            durationSeconds: data.durationSeconds || 0,
          });
        });
        setStudents(list);
        setLoadingLoading(false);
      },
      (error) => {
        console.error("Error listening to live monitor pulse:", error);
        setLoadingLoading(false);
      },
    );

    return () => unsubscribe();
  }, [userId, id]);

  // Format durasi pengerjaan siswa
  const formatSecondsToMinutes = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  // Helper untuk menentukan status keaktifan siswa (termasuk deteksi offline > 90 detik)
  const processedStudents = useMemo(() => {
    return students.map((std) => {
      if (std.status === "COMPLETED") return std;

      // Cek apakah heartbeat macet lebih dari 90 detik
      const secondsSinceActive = Math.floor(
        (currentTime - std.lastActiveDate.getTime()) / 1000,
      );

      if (secondsSinceActive > 90) {
        return {
          ...std,
          status: "OFFLINE" as const,
        };
      }

      return std;
    });
  }, [students, currentTime]);

  // Handler bantu submit paksa lembar jawaban siswa dari kejauhan
  const handleForceSubmit = (std: StudentPulse) => {
    showConfirm(
      "Konfirmasi Bantu Submit",
      `Apakah Anda yakin ingin membantu mengirimkan lembar jawaban ${std.studentName} secara paksa?\n\nTindakan ini akan mengunggah data progres pengerjaan terakhirnya (${std.currentProgress} dari ${std.totalQuestions} soal terjawab) ke server untuk dinilai permanen. Gunakan ini jika laptop siswa rusak atau koneksi internet di mejanya putus total.`,
      async () => {
        setSubmittingForStudent(std.id);
        try {
          // 1. Kirim payload jawaban ke API kita seolah-olah dari siswa
          const response = await fetch("/api/exams/submit", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              studentName: std.studentName,
              studentId: std.studentId,
              examToken: id, // Gunakan Token yang saat ini dimonitor (examId atau id)
              answers: std.answers,
              startedAt: new Date(std.startedAt),
              durationSeconds: std.durationSeconds * 1000, // Konversi ke milidetik
              submittedAt: new Date(),
            }),
          });

          const resData = await response.json();

          if (!response.ok && response.status !== 409) {
            throw new Error(
              (resData.error as string) || "Gagal melakukan force submit.",
            );
          }

          // 2. Tandai sukses COMPLETED di Firestore secara paksa
          const studentDocRef = doc(db, "exams", id, "students", std.id);
          await setDoc(
            studentDocRef,
            {
              status: "COMPLETED",
              submitError: null,
            },
            { merge: true },
          );

          showAlert(
            "Berhasil Membantu Submit",
            `Lembar jawaban siswa ${std.studentName} berhasil disubmit secara paksa ke database utama. Status siswa kini berganti menjadi "Selesai".`,
          );
        } catch (err: unknown) {
          console.error("Force submit error:", err);
          const errMsg =
            err instanceof Error
              ? err.message
              : "Gagal mengirim data siswa. Silakan coba beberapa saat lagi.";
          showAlert("Gagal Bantu Submit", errMsg);
        } finally {
          setSubmittingForStudent(null);
        }
      },
    );
  };

  // Hitung metrik ringkasan
  const stats = useMemo(() => {
    const stats = {
      total: processedStudents.length,
      active: 0,
      idle: 0,
      offline: 0,
      completed: 0,
      failed: 0,
    };

    for (const student of processedStudents) {
      switch (student.status) {
        case "ACTIVE":
          stats.active++;
          break;
        case "IDLE":
          stats.idle++;
          break;
        case "OFFLINE":
          stats.offline++;
          break;
        case "COMPLETED":
          stats.completed++;
          break;
        case "SUBMIT_FAILED":
          stats.failed++;
          break;
      }
    }

    return stats;
  }, [processedStudents]);

  // Filter siswa berdasarkan pencarian & status filter
  const filteredStudents = useMemo(() => {
    return processedStudents.filter((std) => {
      const matchesSearch =
        std.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        std.studentId.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesFilter =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && std.status === "ACTIVE") ||
        (statusFilter === "IDLE" && std.status === "IDLE") ||
        (statusFilter === "OFFLINE" && std.status === "OFFLINE") ||
        (statusFilter === "COMPLETED" && std.status === "COMPLETED") ||
        (statusFilter === "FAILED" && std.status === "SUBMIT_FAILED");

      return matchesSearch && matchesFilter;
    });
  }, [processedStudents, searchQuery, statusFilter]);

  if (authLoading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm font-medium text-muted-foreground mt-2">
          Memeriksa Autentikasi Pengawas...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 pb-12 dark:bg-background/40">
      {/* HEADER SECTION */}
      <div className="bg-background border-b shadow-sm sticky top-0 z-30 py-4 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/dashboard/exams")}
              className="-ml-2 hover:bg-muted"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                </span>
                <h1 className="font-heading text-lg sm:text-xl font-black tracking-tight">
                  Pemantauan Ujian Live CBT
                </h1>
              </div>
              <p className="text-xs text-muted-foreground">
                Sesi ID: <strong className="font-mono">{id}</strong> •
                Montioring Realtime
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/dashboard/exams/${id}/results`)}
              className="font-semibold text-xs sm:text-sm h-9"
            >
              Lihat Hasil & Rekap Nilai
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-6 space-y-6">
        {/* STATISTICS SUMMARY WIDGET */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          <Card className="border shadow-sm">
            <CardContent className="p-4 flex flex-col items-center justify-center text-center">
              <Users className="h-5 w-5 text-muted-foreground mb-1" />
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Hadir
              </p>
              <p className="text-2xl font-black">{stats.total}</p>
            </CardContent>
          </Card>

          <Card className="border shadow-sm bg-green-500/5 dark:bg-green-500/10 border-green-500/15">
            <CardContent className="p-4 flex flex-col items-center justify-center text-center">
              <Activity className="h-5 w-5 text-green-500 mb-1" />
              <p className="text-[10px] font-bold uppercase tracking-wider text-green-600 dark:text-green-400">
                Aktif
              </p>
              <p className="text-2xl font-black text-green-600 dark:text-green-400">
                {stats.active}
              </p>
            </CardContent>
          </Card>

          <Card className="border shadow-sm bg-yellow-500/5 dark:bg-yellow-500/10 border-yellow-500/15">
            <CardContent className="p-4 flex flex-col items-center justify-center text-center">
              <Shield className="h-5 w-5 text-yellow-500 mb-1" />
              <p className="text-[10px] font-bold uppercase tracking-wider text-yellow-600 dark:text-yellow-400">
                Idle / Pindah
              </p>
              <p className="text-2xl font-black text-yellow-600 dark:text-yellow-400">
                {stats.idle}
              </p>
            </CardContent>
          </Card>

          <Card className="border shadow-sm bg-red-500/5 dark:bg-red-500/10 border-red-500/15">
            <CardContent className="p-4 flex flex-col items-center justify-center text-center">
              <XOctagon className="h-5 w-5 text-red-500 mb-1 animate-pulse" />
              <p className="text-[10px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
                Gagal Submit
              </p>
              <p className="text-2xl font-black text-red-600 dark:text-red-400">
                {stats.failed}
              </p>
            </CardContent>
          </Card>

          <Card className="border shadow-sm bg-gray-500/5 dark:bg-gray-500/10 border-gray-500/15">
            <CardContent className="p-4 flex flex-col items-center justify-center text-center">
              <Clock className="h-5 w-5 text-gray-500 mb-1" />
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                Terputus
              </p>
              <p className="text-2xl font-black text-gray-600 dark:text-gray-400">
                {stats.offline}
              </p>
            </CardContent>
          </Card>

          <Card className="border shadow-sm bg-blue-500/5 dark:bg-blue-500/10 border-blue-500/15">
            <CardContent className="p-4 flex flex-col items-center justify-center text-center">
              <CheckCircle2 className="h-5 w-5 text-blue-500 mb-1" />
              <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                Selesai
              </p>
              <p className="text-2xl font-black text-blue-600 dark:text-blue-400">
                {stats.completed}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* SEARCH, FILTER & SINKRONISASI */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center bg-background border rounded-xl p-4 shadow-sm">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-muted-foreground" />
            <Input
              placeholder="Cari nama atau ID siswa..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1">
            <Button
              variant={statusFilter === "ALL" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("ALL")}
              className="h-9 px-3.5 text-xs font-semibold shrink-0"
            >
              Semua ({stats.total})
            </Button>
            <Button
              variant={statusFilter === "ACTIVE" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("ACTIVE")}
              className="h-9 px-3.5 text-xs font-semibold shrink-0 text-green-600 border-green-500/20"
            >
              Aktif ({stats.active})
            </Button>
            <Button
              variant={statusFilter === "IDLE" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("IDLE")}
              className="h-9 px-3.5 text-xs font-semibold shrink-0 text-yellow-600 border-yellow-500/20"
            >
              Idle ({stats.idle})
            </Button>
            <Button
              variant={statusFilter === "FAILED" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("FAILED")}
              className="h-9 px-3.5 text-xs font-semibold shrink-0 text-red-600 border-red-500/20"
            >
              Gagal Submit ({stats.failed})
            </Button>
            <Button
              variant={statusFilter === "OFFLINE" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("OFFLINE")}
              className="h-9 px-3.5 text-xs font-semibold shrink-0 text-gray-600 border-gray-500/20"
            >
              Offline ({stats.offline})
            </Button>
            <Button
              variant={statusFilter === "COMPLETED" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("COMPLETED")}
              className="h-9 px-3.5 text-xs font-semibold shrink-0 text-blue-600 border-blue-500/20"
            >
              Selesai ({stats.completed})
            </Button>
          </div>
        </div>

        {/* LOADING DATA ANIMATION */}
        {loadingData ? (
          <div className="flex h-[40vh] flex-col items-center justify-center gap-3 bg-background border rounded-xl shadow-sm">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm font-medium text-muted-foreground">
              Menghubungkan Saluran Live Monitoring
            </p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="flex h-[40vh] flex-col items-center justify-center gap-3 bg-background border rounded-xl shadow-sm p-6 text-center select-none">
            <Users className="h-12 w-12 text-muted-foreground/40" />
            <p className="font-heading text-lg font-bold">
              Tidak Ada Siswa Terdeteksi
            </p>
            <p className="text-sm text-muted-foreground max-w-sm">
              Belum ada siswa yang masuk ke sesi ujian ini, atau tidak ada siswa
              yang cocok dengan filter pencarian Anda.
            </p>
          </div>
        ) : (
          /* STUDENT CARDS GRID */
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredStudents.map((std) => {
              // 🟢 ACTIVE CARD
              if (std.status === "ACTIVE") {
                return (
                  <Card
                    key={std.id}
                    className="border border-green-500/30 shadow-sm bg-green-500/[0.02] relative overflow-hidden flex flex-col justify-between"
                  >
                    <div className="absolute top-0 right-0 bg-green-500 text-white font-mono text-[9px] font-bold tracking-widest uppercase px-2.5 py-0.5 rounded-bl-lg shadow-sm flex items-center gap-1">
                      <span className="relative flex h-1.5 w-1.5 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white"></span>
                      </span>
                      ONLINE
                    </div>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base font-bold pr-14 leading-snug line-clamp-1">
                        {std.studentName}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        ID Siswa/Absen:{" "}
                        <strong className="font-semibold text-foreground">
                          {std.studentId}
                        </strong>
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 pb-4 flex-1 flex flex-col justify-between">
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between items-center bg-green-500/10 p-2 rounded-lg text-green-700 dark:text-green-400 font-semibold">
                          <span>Progres Soal:</span>
                          <span className="font-mono text-sm">
                            {std.currentProgress} / {std.totalQuestions} Soal (
                            {Math.round(
                              (std.currentProgress / std.totalQuestions) * 100,
                            ) || 0}
                            %)
                          </span>
                        </div>
                        <div className="space-y-1 text-muted-foreground mt-2">
                          <p className="flex justify-between">
                            <span>Durasi:</span>{" "}
                            <strong className="text-foreground">
                              {formatSecondsToMinutes(std.durationSeconds)}
                            </strong>
                          </p>
                          <p className="flex justify-between">
                            <span>Pelanggaran:</span>{" "}
                            <strong className="text-foreground">
                              {std.violationCount} / 3 kali
                            </strong>
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              }

              // 🟡 IDLE CARD
              if (std.status === "IDLE") {
                return (
                  <Card
                    key={std.id}
                    className="border border-yellow-500 shadow-md bg-yellow-500/[0.03] relative overflow-hidden flex flex-col justify-between animate-pulse"
                  >
                    <div className="absolute top-0 right-0 bg-yellow-500 text-black font-mono text-[9px] font-black tracking-widest uppercase px-2.5 py-0.5 rounded-bl-lg shadow-sm flex items-center gap-1">
                      ⚠️ IDLE / KELUAR
                    </div>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base font-bold pr-14 leading-snug line-clamp-1">
                        {std.studentName}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        ID Siswa/Absen:{" "}
                        <strong className="font-semibold text-foreground">
                          {std.studentId}
                        </strong>
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 pb-4 flex-1 flex flex-col justify-between">
                      <div className="space-y-2 text-xs">
                        <div className="bg-yellow-500/15 border border-yellow-500/30 text-yellow-700 dark:text-yellow-400 p-2.5 rounded-lg text-center font-bold">
                          ⚠️ Meninggalkan Layar Ujian!
                        </div>
                        <div className="flex justify-between items-center p-2 bg-muted rounded-lg text-muted-foreground mt-2 font-semibold">
                          <span>Terakhir Diketik:</span>
                          <span className="font-mono">
                            {std.currentProgress} / {std.totalQuestions} Soal
                          </span>
                        </div>
                        <div className="space-y-1 text-muted-foreground mt-2">
                          <p className="flex justify-between">
                            <span>Total Pelanggaran:</span>{" "}
                            <strong className="text-destructive font-black text-sm">
                              {std.violationCount} dari 3
                            </strong>
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              }

              // 🔴 SUBMIT_FAILED CARD
              if (std.status === "SUBMIT_FAILED") {
                return (
                  <Card
                    key={std.id}
                    className="border-2 border-red-500 shadow-lg bg-red-500/[0.04] relative overflow-hidden flex flex-col justify-between ring-2 ring-red-500/20"
                  >
                    <div className="absolute top-0 right-0 bg-red-500 text-white font-mono text-[9px] font-black tracking-widest uppercase px-2.5 py-0.5 rounded-bl-lg shadow-sm animate-bounce">
                      🚨 GAGAL SUBMIT
                    </div>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base font-bold pr-14 leading-snug line-clamp-1">
                        {std.studentName}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        ID Siswa/Absen:{" "}
                        <strong className="font-semibold text-foreground">
                          {std.studentId}
                        </strong>
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 pb-4 flex-1 flex flex-col justify-between">
                      <div className="space-y-2.5 text-xs">
                        <div className="bg-red-500/15 border border-red-500/30 text-red-600 dark:text-red-400 p-2.5 rounded-lg font-bold text-center">
                          ❌ Gagal Mengirim Jawaban ke Server!
                        </div>
                        <div className="bg-muted p-2.5 rounded-lg border text-[11px] leading-relaxed break-words font-mono text-muted-foreground">
                          <span className="font-semibold text-destructive">
                            Kendala:
                          </span>{" "}
                          {std.submitError || "Tidak diketahui"}
                        </div>
                        <div className="space-y-1 text-muted-foreground mt-1">
                          <p className="flex justify-between">
                            <span>Jawaban Tersimpan:</span>{" "}
                            <strong className="text-foreground">
                              {std.currentProgress} Soal
                            </strong>
                          </p>
                          <p className="flex justify-between">
                            <span>Durasi Pengerjaan:</span>{" "}
                            <strong className="text-foreground">
                              {formatSecondsToMinutes(std.durationSeconds)}
                            </strong>
                          </p>
                        </div>
                      </div>
                      <div className="pt-2">
                        <Button
                          variant="destructive"
                          onClick={() => handleForceSubmit(std)}
                          disabled={submittingForStudent !== null}
                          className="w-full bg-red-600 hover:bg-red-700 text-white font-black h-9 text-xs"
                        >
                          {submittingForStudent === std.id ? (
                            <>
                              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                              Mengeksekusi Submit...
                            </>
                          ) : (
                            <>
                              <Send className="mr-1.5 h-3.5 w-3.5" />
                              BANTU SUBMIT SEKARANG
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              }

              // ⚪ OFFLINE CARD
              if (std.status === "OFFLINE") {
                return (
                  <Card
                    key={std.id}
                    className="border border-muted-foreground/30 shadow-sm bg-muted/20 relative overflow-hidden flex flex-col justify-between opacity-80"
                  >
                    <div className="absolute top-0 right-0 bg-muted-foreground/50 text-white font-mono text-[9px] font-bold tracking-widest uppercase px-2.5 py-0.5 rounded-bl-lg shadow-sm">
                      ⚪ OFFLINE
                    </div>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base font-bold pr-14 leading-snug line-clamp-1 text-muted-foreground">
                        {std.studentName}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        ID Siswa/Absen:{" "}
                        <strong className="font-semibold">
                          {std.studentId}
                        </strong>
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 pb-4 flex-1 flex flex-col justify-between">
                      <div className="space-y-2 text-xs">
                        <div className="bg-muted-foreground/10 border text-muted-foreground p-2.5 rounded-lg text-center font-semibold">
                          {"⚪ Terputus > 90 detik (Cek koneksi)"}
                        </div>
                        <div className="space-y-1 text-muted-foreground mt-2">
                          <p className="flex justify-between">
                            <span>Progres Terakhir:</span>{" "}
                            <strong className="text-foreground">
                              {std.currentProgress} / {std.totalQuestions} Soal
                            </strong>
                          </p>
                          <p className="flex justify-between">
                            <span>Waktu Pengerjaan:</span>{" "}
                            <strong className="text-foreground">
                              {formatSecondsToMinutes(std.durationSeconds)}
                            </strong>
                          </p>
                        </div>
                      </div>
                      <div className="pt-2">
                        <Button
                          variant="outline"
                          onClick={() => handleForceSubmit(std)}
                          disabled={submittingForStudent !== null}
                          className="w-full border-muted-foreground/30 hover:bg-muted text-foreground font-semibold h-9 text-xs"
                        >
                          {submittingForStudent === std.id ? (
                            <>
                              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                              Memproses...
                            </>
                          ) : (
                            <>
                              <Send className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
                              Bantu Submit Jawaban Terakhir
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              }

              // 🔵 COMPLETED CARD
              return (
                <Card
                  key={std.id}
                  className="border border-blue-500/30 shadow-sm bg-blue-500/[0.02] relative overflow-hidden flex flex-col justify-between"
                >
                  <div className="absolute top-0 right-0 bg-blue-500 text-white font-mono text-[9px] font-bold tracking-widest uppercase px-2.5 py-0.5 rounded-bl-lg shadow-sm flex items-center gap-1">
                    <Check className="h-3 w-3 shrink-0" />
                    SELESAI
                  </div>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-bold pr-14 leading-snug line-clamp-1 text-blue-600 dark:text-blue-400">
                      {std.studentName}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      ID Siswa/Absen:{" "}
                      <strong className="font-semibold text-foreground">
                        {std.studentId}
                      </strong>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 pb-4 flex-1 flex flex-col justify-between">
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between items-center bg-blue-500/10 p-2 rounded-lg text-blue-700 dark:text-blue-400 font-bold">
                        <span>Status Pengiriman:</span>
                        <span className="flex items-center gap-1">
                          <Check className="h-4 w-4 shrink-0 text-blue-500" />{" "}
                          Sukses Tersimpan
                        </span>
                      </div>
                      <div className="space-y-1 text-muted-foreground mt-2">
                        <p className="flex justify-between">
                          <span>Soal Dikerjakan:</span>{" "}
                          <strong className="text-foreground">
                            {std.currentProgress} / {std.totalQuestions} Soal
                            (100%)
                          </strong>
                        </p>
                        <p className="flex justify-between">
                          <span>Durasi Total:</span>{" "}
                          <strong className="text-foreground">
                            {formatSecondsToMinutes(std.durationSeconds)}
                          </strong>
                        </p>
                        <p className="flex justify-between">
                          <span>Total Pelanggaran:</span>{" "}
                          <strong className="text-foreground">
                            {std.violationCount} kali
                          </strong>
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
