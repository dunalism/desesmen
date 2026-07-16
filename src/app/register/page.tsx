"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams, notFound } from "next/navigation";
import {
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  deleteUser,
} from "firebase/auth";
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
import {
  Loader2,
  User,
  Mail,
  Lock,
  ShieldCheck,
  ArrowLeft,
} from "lucide-react";
import { useDialog } from "@/components/ui/dialog-provider";

// RegisterForm component that reads URL parameters and performs validation
function RegisterForm() {
  const searchParams = useSearchParams();
  const secretParam = searchParams.get("secret");
  const expectedSecret = process.env.NEXT_PUBLIC_REGISTRATION_SECRET;
  const router = useRouter();

  const { showAlert } = useDialog();

  // Security Check: If the URL secret parameter is missing or doesn't match,
  // we immediately trigger Next.js notFound() to display a standard 404 page.
  if (!secretParam || secretParam !== expectedSecret) {
    notFound();
  }

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError("Nama lengkap wajib diisi.");
      return;
    }

    if (!email.trim() || !password) {
      setError("Email dan kata sandi wajib diisi.");
      return;
    }

    if (password.length < 6) {
      setError("Kata sandi harus terdiri dari minimal 6 karakter.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Konfirmasi kata sandi tidak cocok.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Create a new user with Email and Password using Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );
      const user = userCredential.user;

      if (!user.email || !user.uid) {
        throw new Error("Gagal memperoleh data pengguna dari Firebase.");
      }

      // 2. Update the user profile with the display name in Firebase Auth
      await updateProfile(user, {
        displayName: name.trim(),
      });

      const syncResponse = await fetch("/api/auth/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: user.uid,
          email: user.email,
          name: user.displayName || user.email.split("@")[0],
        }),
      });

      if (!syncResponse.ok) {
        const syncData = await syncResponse.json();
        // Rollback Firebase session since sync with DB failed
        await deleteUser(user);
        throw new Error(
          syncData.error || "Gagal melakukan sinkronisasi data ke database.",
        );
      }

      showAlert("Pendaftaran Berhasil", "Akun berhasil dibuat.");
      setName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      signOut(auth);
    } catch (err: unknown) {
      console.error("Registration Error:", err);
      let errorMessage = "Terjadi kesalahan saat membuat akun Anda.";

      if (err && typeof err === "object" && "code" in err) {
        const firebaseError = err as { code: string; message?: string };
        switch (firebaseError.code) {
          case "auth/email-already-in-use":
            errorMessage = "Email sudah digunakan oleh akun lain.";
            break;
          case "auth/invalid-email":
            errorMessage = "Format alamat email tidak valid.";
            break;
          case "auth/operation-not-allowed":
            errorMessage =
              "Metode pendaftaran Email & Kata Sandi belum diaktifkan di Firebase Console.";
            break;
          case "auth/weak-password":
            errorMessage = "Kata sandi terlalu lemah.";
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
    <Card className="w-full max-w-md">
      <CardHeader className="text-center space-y-2">
        <div className="mx-auto bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-2">
          <ShieldCheck className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight">
          Pendaftaran Akun
        </CardTitle>
        <CardDescription className="text-sm">
          Buat akun baru dengan kredensial email & password
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleRegister} className="space-y-4">
          {error && (
            <div className="bg-destructive/15 border border-destructive/30 text-destructive text-sm p-3 rounded-md text-center font-medium leading-relaxed">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Nama Lengkap</Label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="name"
                placeholder="Admin Epalio"
                className="pl-9 h-11"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
                required
              />
            </div>
          </div>

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

          <div className="space-y-2">
            <Label htmlFor="password">Kata Sandi</Label>
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

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Konfirmasi Kata Sandi</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                className="pl-9 h-11"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                required
              />
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full h-11">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? "Mendaftarkan Akun..." : "Daftar Akun Baru"}
          </Button>
          <Button
            className="w-full h-11"
            type="button"
            variant="ghost"
            onClick={() => router.push("/login")}
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali ke Halaman Login
          </Button>
        </form>
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground justify-center text-center pb-6 border-t pt-4">
        Halaman registrasi ini bersifat rahasia dan hanya dapat diakses oleh
        pengembang aplikasi.
      </CardFooter>
    </Card>
  );
}

// Fallback loader for React Suspense boundary
function RegisterFallback() {
  return (
    <Card className="w-full max-w-md">
      <CardContent className="py-12 flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground font-medium animate-pulse">
          Memeriksa izin akses...
        </p>
      </CardContent>
    </Card>
  );
}

export default function RegisterPage() {
  return (
    <div className="flex-1 flex items-center justify-center min-h-[80vh] px-4">
      <Suspense fallback={<RegisterFallback />}>
        <RegisterForm />
      </Suspense>
    </div>
  );
}
