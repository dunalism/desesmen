"use client";

import { useEffect, useState, useRef } from "react";
import { Clock } from "lucide-react";

interface CbtTimerProps {
  durationMinutes: number;
  token: string;
  startedAt: number; // timestamp saat sesi ujian dimulai
  onTimeUp: () => void;
}

// 🔐 UTILITY UNTUK PENYAMARAN DATA LOCALSTORAGE (Anti Inspect Element Hack)
const SALT = 13; // Angka pengali rahasia sederhana

const encodeSecureTime = (seconds: number): string => {
  // Kalikan dengan SALT lalu ubah menjadi format teks Base64
  return btoa((seconds * SALT).toString());
};

const decodeSecureTime = (encoded: string): number | null => {
  try {
    // Kembalikan dari Base64 lalu bagi dengan SALT
    const rawValue = Math.floor(Number(atob(encoded)) / SALT);
    return isNaN(rawValue) ? null : rawValue;
  } catch {
    // Jika siswa mengedit string secara acak di console, kembalikan null (akan dipaksa habis waktu)
    return null;
  }
};

export default function CbtTimer({
  durationMinutes,
  token,
  startedAt,
  onTimeUp,
}: CbtTimerProps) {
  const [timeLeft, setTimeLeft] = useState<number>(() => {
    // 1. Hitung sisa waktu matematika asli berdasarkan server timestamp (Kebenaran Mutlak)
    const totalDurationSeconds = durationMinutes * 60;
    const elapsedSeconds = Math.floor(
      (Date.now() - new Date(atob(startedAt.toString())).getTime()) / 1000,
    );
    const serverCalculatedLeft = totalDurationSeconds - elapsedSeconds;
    const safeServerLeft = serverCalculatedLeft > 0 ? serverCalculatedLeft : 0;

    if (typeof window !== "undefined") {
      const savedTimeEncoded = localStorage.getItem(`cbt-timer-${token}`);

      if (savedTimeEncoded) {
        const decodedSeconds = decodeSecureTime(savedTimeEncoded);

        // Jika data diubah paksa secara tidak sah oleh siswa, hukum dengan waktu habis (0)
        if (decodedSeconds === null) return 0;

        // 2. PROTEKSI CROSS-CHECK: Jika siswa mencoba membesarkan angka di localStorage,
        // paksa sistem mengambil nilai terkecil demi menghindari kecurangan penambahan waktu.
        return Math.min(decodedSeconds, safeServerLeft);
      }
    }

    return safeServerLeft;
  });

  const onTimeUpRef = useRef(onTimeUp);
  useEffect(() => {
    onTimeUpRef.current = onTimeUp;
  }, [onTimeUp]);

  useEffect(() => {
    if (timeLeft <= 0) {
      onTimeUpRef.current();
      return;
    }

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        const nextTime = prev - 1;

        if (typeof window !== "undefined") {
          // Simpan ke localStorage menggunakan enkripsi Base64 tersamar
          localStorage.setItem(
            `cbt-timer-${token}`,
            encodeSecureTime(nextTime),
          );
        }

        if (nextTime <= 0) {
          clearInterval(interval);
          onTimeUpRef.current();
          return 0;
        }
        return nextTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [token, timeLeft]);

  // Format seconds to mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const isLowTime = timeLeft < 300; // Sisa waktu kurang dari 5 menit

  return (
    <div
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-mono font-bold text-sm sm:text-base select-none ${
        isLowTime
          ? "border-destructive bg-destructive/10 text-destructive animate-pulse"
          : "border-border bg-muted/50 text-foreground"
      }`}
    >
      <Clock
        className={`h-4 w-4 ${isLowTime ? "text-destructive" : "text-muted-foreground"}`}
      />
      <span>{formatTime(timeLeft)}</span>
    </div>
  );
}
