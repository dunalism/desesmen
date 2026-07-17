"use client";

import React, { useEffect, useState, useRef } from "react";
import {
  onAuthStateChanged,
  updateProfile,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  type User,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useDialog } from "@/components/ui/dialog-provider";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Loader2,
  Edit2,
  KeyRound,
  UserRound,
  Camera,
  ShieldCheck,
  X,
} from "lucide-react";

// Client-side image compression utility before uploading to keep sizes lightweight
function compressImageBeforeUpload(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 300;
        const MAX_HEIGHT = 300;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error("Gagal kompresi blob"));
            }
          },
          "image/jpeg",
          0.85,
        );
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}

export default function ProfilePage() {
  const { showAlert } = useDialog();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [user, setUser] = useState<User | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);

  // Form State
  const [displayName, setDisplayName] = useState("");
  const [photoURL, setPhotoURL] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [imgbbApiKey, setImgbbApiKey] = useState("");

  // UI Flow State
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setDisplayName(currentUser.displayName || "");

        // Fallback checks for stored avatar
        const storedLocalAvatar = localStorage.getItem(
          `user_avatar_base64_${currentUser.uid}`,
        );
        setPhotoURL(storedLocalAvatar || currentUser.photoURL || "");
      }
      setLoadingSession(false);
    });

    return () => unsubscribe();
  }, []);

  // Set API Key separately to avoid synchronous call in onAuthStateChanged effect block
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedApiKey = localStorage.getItem("imgbb_api_key") || "";
      // Avoid calling state synchronously if it matches, but since it runs once on mount, we can use a functional check or load initial value directly.
    }
  }, []);

  if (loadingSession) {
    return (
      <div className="flex flex-1 items-center justify-center py-20">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-20 space-y-4">
        <p className="text-muted-foreground font-semibold">
          Silakan login untuk melihat halaman ini.
        </p>
      </div>
    );
  }

  // Check if form actually has changes (including our custom local avatar)
  const getOriginalAvatar = () => {
    if (!user) return "";
    return (
      localStorage.getItem(`user_avatar_base64_${user.uid}`) ||
      user.photoURL ||
      ""
    );
  };

  const hasProfileChanges =
    displayName !== (user.displayName || "") ||
    photoURL !== getOriginalAvatar();

  const hasPasswordChanges = newPassword.trim() !== "";

  // ImgBB API key update detection
  const originalApiKey =
    typeof window !== "undefined"
      ? localStorage.getItem("imgbb_api_key") || ""
      : "";
  const hasApiKeyChanges = imgbbApiKey.trim() !== originalApiKey;

  const hasChanges =
    hasProfileChanges || hasPasswordChanges || hasApiKeyChanges;

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleCancelClick = () => {
    setDisplayName(user.displayName || "");
    setPhotoURL(getOriginalAvatar());
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setIsEditing(false);
  };

  const handlePhotoUploadClick = () => {
    if (!isEditing) return;
    fileInputRef.current?.click();
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        showAlert("Tipe Berkas Salah", "Harap pilih berkas gambar.");
        return;
      }

      const activeApiKey =
        imgbbApiKey.trim() || process.env.NEXT_PUBLIC_IMGBB_API_KEY || "";
      if (!activeApiKey) {
        showAlert(
          "ImgBB API Key Diperlukan",
          "Harap masukkan ImgBB API Key Anda di kolom bawah terlebih dahulu untuk mengunggah foto profil secara resmi.",
        );
        return;
      }

      setIsUploadingPhoto(true);

      try {
        // Compress image first to make upload super light (under 300x300, JPEG 0.85)
        const compressedBlob = await compressImageBeforeUpload(file);

        // Prepare FormData
        const formData = new FormData();
        formData.append("image", compressedBlob, file.name);

        // Upload to ImgBB
        const response = await fetch(
          `https://api.imgbb.com/1/upload?key=${activeApiKey}`,
          {
            method: "POST",
            body: formData,
          },
        );

        const result = await response.json();
        if (result.success) {
          const shortUrl = result.data.url;
          setPhotoURL(shortUrl);
          showAlert(
            "Foto Profil Diunggah",
            "Foto berhasil diunggah ke cloud ImgBB. Klik 'Simpan Perubahan' di bawah untuk menerapkan.",
          );
        } else {
          console.error("ImgBB error:", result);
          showAlert(
            "Gagal Unggah Gambar",
            result.error?.message || "Kesalahan respon dari server ImgBB.",
          );
        }
      } catch (err) {
        console.error("Gagal memproses/unggah foto:", err);
        showAlert(
          "Kesalahan Unggah",
          "Terjadi kesalahan saat mengompresi atau mengunggah gambar.",
        );
      } finally {
        setIsUploadingPhoto(false);
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasChanges) return;

    // Password Validation
    if (hasPasswordChanges) {
      if (newPassword.length < 6) {
        showAlert(
          "Kata Sandi Terlalu Pendek",
          "Kata sandi baru harus minimal 6 karakter.",
        );
        return;
      }
      if (newPassword !== confirmPassword) {
        showAlert(
          "Kata Sandi Tidak Cocok",
          "Konfirmasi kata sandi baru tidak cocok dengan kata sandi baru.",
        );
        return;
      }
      if (!currentPassword) {
        showAlert(
          "Kata Sandi Saat Ini Diperlukan",
          "Masukkan kata sandi Anda saat ini untuk mengubah kata sandi.",
        );
        return;
      }
    }

    setIsLoading(true);
    const updatedFields: string[] = [];

    try {
      // Save ImgBB API Key to local storage
      if (hasApiKeyChanges) {
        localStorage.setItem("imgbb_api_key", imgbbApiKey.trim());
        updatedFields.push("Kunci API ImgBB");
      }

      // 1. Update Profile (DisplayName & photoURL directly to Firebase Auth!)
      if (hasProfileChanges) {
        const payload: {
          displayName?: string | null;
          photoURL?: string | null;
        } = {};

        if (displayName !== (user.displayName || "")) {
          payload.displayName = displayName.trim() || null;
          updatedFields.push("Nama Lengkap");
        }

        if (photoURL !== getOriginalAvatar()) {
          payload.photoURL = photoURL || null;

          // Clear legacy local storage Base64 avatar since we are now using official cloud photoURL
          localStorage.removeItem(`user_avatar_base64_${user.uid}`);

          // Dispatch custom event to let layout sync instantly
          window.dispatchEvent(new Event("localAvatarUpdated"));
          updatedFields.push("Foto Profil");
        }

        if (Object.keys(payload).length > 0) {
          await updateProfile(user, payload);
        }
      }

      // 2. Update Password
      if (hasPasswordChanges) {
        try {
          await updatePassword(user, newPassword);
          updatedFields.push("Kata Sandi");
        } catch (error) {
          const firebaseError = error as { code?: string; message?: string };
          // Firebase re-authentication error (e.g. auth/requires-recent-login)
          if (
            firebaseError.code === "auth/requires-recent-login" ||
            firebaseError.message?.includes("recent-login")
          ) {
            try {
              const credential = EmailAuthProvider.credential(
                user.email || "",
                currentPassword,
              );
              await reauthenticateWithCredential(user, credential);
              // Retry update password after re-authentication
              await updatePassword(user, newPassword);
              updatedFields.push("Kata Sandi");
            } catch (reauthError) {
              const rError = reauthError as { code?: string };
              console.error("Re-authentication error:", reauthError);
              let errorMsg =
                "Kata sandi saat ini yang Anda masukkan salah atau sesi re-autentikasi gagal.";
              if (rError.code === "auth/wrong-password") {
                errorMsg = "Kata sandi saat ini salah.";
              }
              showAlert("Autentikasi Gagal", errorMsg);
              setIsLoading(false);
              return;
            }
          } else {
            console.error("Password update error:", error);
            showAlert(
              "Gagal Ganti Kata Sandi",
              firebaseError.message || "Gagal memperbarui kata sandi.",
            );
            setIsLoading(false);
            return;
          }
        }
      }

      // Successful operation
      setIsEditing(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      // Update current user references in our client auth state
      if (auth.currentUser) {
        setUser({ ...auth.currentUser });
      }

      showAlert(
        "Profil Diperbarui",
        `Selamat! Profil Anda berhasil diperbarui:\n${updatedFields.map((field) => `• ${field}`).join("\n")}`,
      );
    } catch (err) {
      const generalError = err as { message?: string };
      console.error("Gagal menyimpan profil:", err);
      showAlert(
        "Pembaruan Gagal",
        generalError.message || "Terjadi kesalahan saat menyimpan perubahan.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Akun Saya</h1>
          <p className="text-sm text-muted-foreground">
            Kelola informasi pribadi dan pengaturan keamanan akun Anda.
          </p>
        </div>
        {!isEditing && (
          <Button
            onClick={handleEditClick}
            className="h-11 gap-2 font-semibold px-4 rounded-xl"
          >
            <Edit2 className="h-4 w-4" />
            Edit Profil
          </Button>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <Card className="rounded-xl overflow-hidden shadow-sm border border-border">
          <CardHeader className="bg-muted/10">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <UserRound className="h-5 w-5 text-primary" />
              Detail Profil
            </CardTitle>
            <CardDescription>
              Informasi umum tentang identitas Anda di Epalio.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            {/* Foto Profil Area */}
            <div className="flex flex-col items-center sm:flex-row gap-6">
              <div className="relative group select-none">
                <Avatar className="size-24 border-2 border-border shadow-inner">
                  <AvatarImage src={photoURL} alt={displayName} />
                  <AvatarFallback className="text-2xl font-bold">
                    {displayName?.charAt(0) || user.email?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                {isEditing && (
                  <button
                    type="button"
                    onClick={handlePhotoUploadClick}
                    className="absolute inset-0 bg-black/40 text-white rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-xs"
                  >
                    <Camera className="h-5 w-5 mb-1" />
                    Ubah
                  </button>
                )}
              </div>
              <div className="text-center sm:text-left space-y-1.5">
                <h3 className="font-semibold text-base">
                  {displayName || "Pengguna Epalio"}
                </h3>
                <p className="text-sm text-muted-foreground">{user.email}</p>
                {isEditing && (
                  <div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handlePhotoUploadClick}
                      className="rounded-lg text-xs"
                    >
                      Pilih Foto Baru
                    </Button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handlePhotoChange}
                      accept="image/*"
                      className="hidden"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-4">
              {/* Nama Lengkap Input */}
              <div className="space-y-2">
                <Label htmlFor="displayName" className="font-semibold text-sm">
                  Nama Lengkap
                </Label>
                <div className="relative">
                  <Input
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    disabled={!isEditing}
                    placeholder="Masukkan nama lengkap Anda"
                    className="h-11 pl-3 rounded-lg w-full"
                  />
                </div>
              </div>

              {/* Email Address Input (ReadOnly) */}
              <div className="space-y-2">
                <Label className="font-semibold text-sm">Email Aktif</Label>
                <Input
                  value={user.email || ""}
                  disabled
                  className="h-11 pl-3 rounded-lg w-full bg-muted/40 text-muted-foreground select-all"
                />
                <p className="text-xs text-muted-foreground/80 flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  Email utama tidak dapat diubah untuk keamanan akun.
                </p>
              </div>

              {/* ImgBB API Key Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="imgbbApiKey"
                    className="font-semibold text-sm"
                  >
                    ImgBB API Key
                  </Label>
                  <a
                    href="https://api.imgbb.com/"
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-primary hover:underline font-medium"
                  >
                    Dapatkan Kunci API Gratis ↗
                  </a>
                </div>
                <Input
                  id="imgbbApiKey"
                  type="password"
                  value={imgbbApiKey}
                  onChange={(e) => setImgbbApiKey(e.target.value)}
                  disabled={!isEditing}
                  placeholder={
                    process.env.NEXT_PUBLIC_IMGBB_API_KEY
                      ? "Menggunakan Kunci API dari Environment"
                      : "Masukkan ImgBB API Key Anda"
                  }
                  className="h-11 pl-3 rounded-lg w-full font-mono"
                />
                <p className="text-xs text-muted-foreground/80">
                  Digunakan untuk mengunggah dan melacak foto profil Anda di
                  awan (cloud) agar menghasilkan URL pendek yang responsif dan
                  hemat bandwidth.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {isEditing && (
          <Card className="rounded-xl overflow-hidden shadow-sm border border-border">
            <CardHeader className="bg-muted/10">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-primary" />
                Ganti Kata Sandi
              </CardTitle>
              <CardDescription>
                Isi bagian ini hanya jika Anda ingin mengubah kata sandi akun
                Anda.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              {/* Current Password */}
              <div className="space-y-2">
                <Label
                  htmlFor="currentPassword"
                  className="font-semibold text-sm"
                >
                  Kata Sandi Saat Ini{" "}
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Masukkan kata sandi lama Anda"
                  className="h-11 pl-3 rounded-lg w-full"
                  required={hasPasswordChanges}
                />
              </div>

              {/* New Password & Confirm Password Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="newPassword"
                    className="font-semibold text-sm"
                  >
                    Kata Sandi Baru
                  </Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Kata sandi baru"
                    className="h-11 pl-3 rounded-lg w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="confirmPassword"
                    className="font-semibold text-sm"
                  >
                    Konfirmasi Kata Sandi Baru
                  </Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Konfirmasi kata sandi"
                    className="h-11 pl-3 rounded-lg w-full"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {isEditing && (
          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancelClick}
              disabled={isLoading}
              className="h-11 w-full sm:w-auto font-semibold px-5 rounded-xl gap-2 order-2 sm:order-1"
            >
              <X className="h-4 w-4" />
              Batal
            </Button>
            <Button
              type="submit"
              disabled={!hasChanges || isLoading}
              className="h-11 w-full sm:w-auto font-semibold px-6 rounded-xl gap-2 order-1 sm:order-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>Simpan Perubahan</>
              )}
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}
