"use client";

import { useState } from "react";
import Link from "next/link";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, KeyRound, Mail, ArrowLeft, CheckCircle2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Alamat email wajib diisi.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Send password reset email via Firebase Auth Client SDK
      await sendPasswordResetEmail(auth, email);
      setSuccess(true);
    } catch (err: unknown) {
      console.error("Password Reset Error:", err);
      let errorMessage =
        "Terjadi kesalahan saat mencoba mengirim instruksi pemulihan.";

      if (err && typeof err === "object" && "code" in err) {
        const firebaseError = err as { code: string; message?: string };
        switch (firebaseError.code) {
          case "auth/invalid-email":
            errorMessage = "Format email tidak valid.";
            break;
          case "auth/user-not-found":
            errorMessage = "Email tidak ditemukan dalam sistem kami.";
            break;
          case "auth/user-disabled":
            errorMessage =
              "Silakan hubungi pengembang aplikasi untuk berlangganan";
            break;
          case "auth/too-many-requests":
            errorMessage =
              "Terlalu banyak permintaan pemulihan kata sandi. Silakan coba lagi nanti.";
            break;
          default:
            errorMessage = firebaseError.message || errorMessage;
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center min-h-[80vh] px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-2">
            <KeyRound className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">
            Lupa Kata Sandi?
          </CardTitle>
          <CardDescription className="text-sm">
            Masukkan email terdaftar Anda untuk menerima tautan pemulihan kata
            sandi
          </CardDescription>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="space-y-4 py-2">
              <div className="bg-green-500/10 border border-green-500/30 text-green-700 dark:text-green-400 p-4 rounded-xl flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-sm">Instruksi Dikirim!</p>
                  <p className="text-xs leading-relaxed opacity-95">
                    Tautan untuk menyetel ulang kata sandi telah dikirim ke
                    email <strong>{email}</strong>. Silakan periksa kotak masuk
                    atau spam email Anda.
                  </p>
                </div>
              </div>
              <Button
                asChild
                variant="outline"
                className="w-full h-11 font-semibold"
              >
                <Link
                  href="/login"
                  className="flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Kembali ke Halaman Masuk
                </Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              {error && (
                <div className="bg-destructive/15 border border-destructive/30 text-destructive text-sm p-3 rounded-md text-center font-medium leading-relaxed">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Alamat Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="nama@email.com"
                    className="pl-9 h-11"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 flex items-center justify-center gap-2 mt-2 transition-transform active:scale-[0.98] font-bold"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading ? "Mengirim Instruksi..." : "Kirim Tautan Pemulihan"}
              </Button>

              <div className="text-center pt-2">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="h-3 w-3" />
                  Kembali ke Login
                </Link>
              </div>
            </form>
          )}
        </CardContent>
        <CardFooter className="text-xs text-muted-foreground justify-center text-center pb-6 border-t pt-4">
          Butuh bantuan? Silakan hubungi admin atau dukungan aplikasi kami.
        </CardFooter>
      </Card>
    </div>
  );
}
