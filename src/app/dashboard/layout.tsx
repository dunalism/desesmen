"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import {
  Loader2,
  LogOut,
  Menu,
  Home,
  FileText,
  ClipboardList,
  Trophy,
  ClipboardCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { CartProvider } from "@/lib/cart-context";
import { FloatingCartBar } from "@/components/dashboard/FloatingCartBar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [showHeader, setShowHeader] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const navigationItems = [
    { href: "/dashboard", label: "Beranda", icon: Home },
    { href: "/dashboard/bank-soal", label: "Bank Soal", icon: FileText },
    { href: "/dashboard/exams", label: "Ujian", icon: ClipboardList },
    { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  ];

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY && currentScrollY > 80) {
        setShowHeader(false);
      } else if (currentScrollY < lastScrollY) {
        setShowHeader(true);
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push("/login");
      } else {
        setUser(currentUser);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      router.push("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  if (loading) {
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

  if (!user) return null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* GLOBAL NAVBAR */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-transform duration-300 bg-card/95 backdrop-blur-sm border-b border-border px-4 sm:px-6 py-4 flex items-center justify-between shadow-sm ${
          showHeader ? "translate-y-0" : "-translate-y-full"
        }`}
      >
        <div className="flex items-center gap-3 sm:gap-6">
          {/* LOGO APLIKASI */}
          <Link href="/" className="flex items-center gap-2">
            <div className="bg-primary/10 p-2 rounded-lg text-primary">
              <ClipboardCheck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-sm sm:text-lg font-bold tracking-tight leading-none md:leading-tight">
                Epalio
              </h1>
              <p className="text-[9px] sm:text-[10px] text-muted-foreground hidden sm:block">
                Smart Assessment
              </p>
            </div>
          </Link>

          {/* DESKTOP NAVIGATION (Layar Lebar) */}
          <nav className="hidden md:flex items-center gap-1 border-l pl-6 h-8">
            {navigationItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${
                  pathname === item.href
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* KANAN NAVBAR: PROFIL DESKTOP & MOBILE MENU TRIGGER */}
        <div className="flex items-center gap-4">
          <div className="text-right hidden md:block">
            <p className="text-sm font-semibold">
              {user.displayName || "Guru"}
            </p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
          <Button
            onClick={handleLogout}
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-destructive hidden md:flex items-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            <span>Keluar</span>
          </Button>

          {/* MOBILE SIDEBAR TRIGGER  */}
          <div className="md:hidden">
            <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground"
                >
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="w-[280px] sm:w-[320px] p-6 flex flex-col justify-between"
              >
                <div className="space-y-6">
                  <SheetHeader className="text-left">
                    <SheetTitle className="flex items-center gap-2">
                      <div className="bg-primary/10 p-2 rounded-lg text-primary">
                        <ClipboardCheck className="h-5 w-5" />
                      </div>
                      <span className="font-bold tracking-tight text-base">
                        Epalio
                      </span>
                    </SheetTitle>
                  </SheetHeader>

                  {/* Menu Navigasi Mobile */}
                  <nav className="flex flex-col gap-2">
                    {navigationItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = pathname === item.href;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setIsMobileOpen(false)}
                          className={`flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl transition-all ${
                            isActive
                              ? "bg-primary/10 text-primary"
                              : "text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          {item.label}
                        </Link>
                      );
                    })}
                  </nav>
                </div>

                {/* Info Profil & Logout Mobile */}
                <div className="border-t pt-4 space-y-4">
                  <div className="px-2">
                    <p className="text-sm font-bold text-foreground truncate">
                      {user.displayName || "Guru"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {user.email}
                    </p>
                  </div>
                  <Button
                    onClick={handleLogout}
                    variant="destructive"
                    className="w-full justify-center gap-2 font-bold rounded-xl"
                  >
                    <LogOut className="h-4 w-4" />
                    Keluar
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* DASHBOARD CONTENT CONTAINER */}
      <CartProvider>
        <main className="flex-1 flex flex-col container max-w-7xl mx-auto pt-24 pb-24 px-4 sm:px-6 lg:px-8">
          {children}
        </main>
        <FloatingCartBar />
      </CartProvider>
    </div>
  );
}
