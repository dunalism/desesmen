"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signInWithEmailAndPassword, onAuthStateChanged } from "firebase/auth";
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
import { Loader2, KeyRound, Mail, Lock } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Redirect to dashboard if already logged in
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        router.push("/dashboard");
      } else {
        setCheckingAuth(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError("Email dan kata sandi wajib diisi.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Sign in with Email and Password using Firebase Auth
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password,
      );
      const user = userCredential.user;

      if (!user.email || !user.uid) {
        throw new Error("Gagal memperoleh data pengguna dari Firebase.");
      }

      // 2. Sync user profile with MySQL using Next.js backend API
      const displayName = user.displayName || user.email.split("@")[0];
      const syncResponse = await fetch("/api/auth/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: user.uid,
          email: user.email,
          name: displayName,
        }),
      });

      if (!syncResponse.ok) {
        const syncData = await syncResponse.json();
        // Rollback Firebase session since sync with DB failed
        await auth.signOut();
        throw new Error(
          syncData.error || "Gagal melakukan sinkronisasi data ke database.",
        );
      }

      // Redirect user to dashboard
      router.push("/dashboard");
    } catch (err: any) {
      console.error("Login Error:", err);

      let errorMessage = "Terjadi kesalahan saat masuk ke akun Anda.";

      if (err && err.code) {
        switch (err.code) {
          case "auth/user-disabled":
            errorMessage =
              "Silakan hubungi pengembang aplikasi untuk berlangganan";
            break;
          case "auth/invalid-credential":
          case "auth/wrong-password":
          case "auth/user-not-found":
            errorMessage = "Email atau kata sandi yang Anda masukkan salah.";
            break;
          case "auth/invalid-email":
            errorMessage = "Format email tidak valid.";
            break;
          case "auth/too-many-requests":
            errorMessage =
              "Terlalu banyak percobaan masuk yang gagal. Silakan coba lagi nanti.";
            break;
          default:
            errorMessage = err.message || errorMessage;
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground font-medium">
            Memverifikasi Sesi Anda...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center min-h-[80vh] px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-2">
            <KeyRound className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">
            Masuk ke Aplikasi
          </CardTitle>
          <CardDescription className="text-sm">
            Masukkan email dan kata sandi Anda untuk masuk ke sistem pembuatan
            soal otomatis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleEmailLogin} className="space-y-4">
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
                  placeholder="nama@domain.com"
                  className="pl-9 h-11"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Kata Sandi</Label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-semibold text-primary hover:underline transition-colors"
                >
                  Lupa kata sandi?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-9 h-11"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
              {loading ? "Sedang Masuk..." : "Masuk Sekarang"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="text-xs text-muted-foreground justify-center text-center pb-6 border-t pt-4">
          Dengan masuk, Anda menyetujui Ketentuan Layanan dan Kebijakan Privasi
          kami.
        </CardFooter>
      </Card>
    </div>
  );
}
