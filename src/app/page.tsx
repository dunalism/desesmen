"use client";

import {
  CheckCircle2,
  Camera,
  FileText,
  Shuffle,
  Printer,
  BarChart3,
  Trophy,
  UploadCloud,
  Sliders,
  Share2,
  Star,
  Clock,
  AlertCircle,
  BookOpenCheck,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { useReveal } from "@/lib/useReveal";

export default function LandingPage() {
  useReveal();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans antialiased  ">
      {/* NAVBAR */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto max-w-7xl px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 p-2 rounded-lg text-primary">
              <BookOpenCheck className="h-6 w-6" />
            </div>
            <Link href="/" className="font-extrabold text-xl tracking-tight">
              Epalio
            </Link>
          </div>
          <nav className="hidden md:flex gap-6 text-sm font-medium text-muted-foreground">
            <Link
              href="#fitur"
              className="hover:text-primary transition-colors"
            >
              Fitur
            </Link>
            <Link
              href="#cara-kerja"
              className="hover:text-primary transition-colors"
            >
              Cara Kerja
            </Link>
            <Link
              href="#testimoni"
              className="hover:text-primary transition-colors"
            >
              Testimoni
            </Link>
          </nav>
          <div className="flex items-center gap-4">
            <Link
              href="/cbt"
              className="text-sm font-semibold hover:text-primary transition-colors"
            >
              CBT
            </Link>
            <Button asChild>
              <Link href="/login">Masuk</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 -mt-11 md:mt-[-99px] ">
        {/* 1. HERO SECTION */}
        <section className="relative overflow-hidden reveal pt-24 pb-20 md:pt-32 md:pb-28 border-b">
          <div className="absolute  inset-0 bg-gradient-to-br from-primary/5 via-background to-background z-0" />
          <div className="container mx-auto px-4 max-w-6xl relative z-10">
            <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-6">
                <SparklesIcon className="h-4 w-4" />
                <span>Revolusi Asesmen Digital 2026</span>
              </div>
              {/* Headline */}
              <h1
                data-reveal
                className="text-4xl reveal-up delay-1 ... md:text-6xl font-extrabold tracking-tight text-foreground mb-6 leading-tight"
              >
                Buat Soal Ujian Berkualitas{" "}
                <span className="text-primary">10x Lebih Cepat</span>
              </h1>
              {/* Sub-headline */}
              <p
                data-reveal
                className="text-lg reveal-up delay-2 ... md:text-xl animate-subtitle text-muted-foreground mb-8 leading-relaxed"
              >
                Lupakan lembur malam hanya untuk mengetik bank soal.{" "}
                <strong className="text-foreground">Epalio</strong> adalah
                asisten pintar berbasis AI yang mengubah gambar materi,
                rangkuman, atau ide spontan Anda menjadi paket asesmen siap uji
                dalam hitungan detik. Biarkan AI yang bekerja, Anda cukup pantau
                hasilnya.
              </p>
              {/* CTA Button & Microcopy */}
              <div className="flex flex-col items-center gap-3 w-full sm:w-auto">
                <Button
                  size="lg"
                  data-reveal
                  className="h-14 reveal-up delay-3 px-8 text-lg font-bold w-full sm:w-auto"
                  asChild
                >
                  <Link href="/login">
                    Coba Gratis Sekarang <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <p className="text-xs text-muted-foreground">
                  Mudah digunakan, tidak perlu instalasi rumit.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 2. SECTION MASALAH (The Pain Point) */}
        <section className="reveal py-20 bg-muted/30 border-b">
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <Badge
                variant="outline"
                className="border-red-500/20 text-red-500 bg-red-500/10 mb-3 px-3 py-1"
              >
                Realita Guru
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
                Mengapa Guru Selalu Kehabisan Waktu?
              </h2>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {/* Masalah 1 */}
              <Card
                data-reveal
                className="bg-background border-none shadow-sm reveal-left delay-1 ..."
              >
                <CardHeader className="space-y-4">
                  <div className="p-3 bg-red-500/10 w-fit rounded-lg text-red-500 mb-4 flex items-center justify-center">
                    <Clock className="w-6 h-6" />
                  </div>
                  <CardTitle className="text-xl font-bold text-foreground">
                    Kelelahan Administrasi
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Mengetik soal secara manual, menyusun format layout Word
                    yang sering berantakan, dan memikirkan opsi pengecoh pilihan
                    ganda yang logis satu per satu.
                  </p>
                </CardContent>
              </Card>
              {/* Masalah 2 */}
              <Card
                data-reveal
                className="bg-background border-none shadow-sm reveal-left delay-2 ..."
              >
                <CardHeader className="space-y-4">
                  <div className="p-3 bg-red-500/10 w-fit rounded-lg text-red-500 mb-4 flex items-center justify-center">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <CardTitle className="text-xl font-bold text-foreground">
                    Koreksi Tanpa Akhir
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Menilai ratusan lembar soal dan jawaban siswa satu per satu
                    hingga larut malam. Mengorbankan waktu berharga bersama
                    keluarga di akhir pekan.
                  </p>
                </CardContent>
              </Card>
              {/* Masalah 3 */}
              <Card
                data-reveal
                className="bg-background border-none shadow-sm reveal-left delay-3 ..."
              >
                <CardHeader className="space-y-4">
                  <div className="p-3 bg-red-500/10 w-fit rounded-lg text-red-500 mb-4 flex items-center justify-center">
                    <BarChart3 className="w-6 h-6" />
                  </div>
                  <CardTitle className="text-xl font-bold text-foreground">
                    Buta Data Hasil Belajar
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Bingung menentukan materi mana yang belum dipahami kelas
                    secara akurat karena tidak adanya analisis butir soal yang
                    praktis dan instan.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
        {/* 3. SECTION FITUR UTAMA (The Ultimate Savior) */}
        <section id="fitur" className=" py-24 bg-background">
          <div
            data-reveal
            className="container mx-auto px-4 max-w-6xl reveal-zoom delay-1 ..."
          >
            <div className="text-center max-w-2xl mx-auto mb-16">
              <Badge
                variant="outline"
                className="border-emerald-200 text-emerald-600 bg-emerald-50/10 mb-3 px-3 py-1"
              >
                Fitur Unggulan
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
                Solusi Cerdas untuk Manajemen Asesmen Anda
              </h2>
              <p className="text-muted-foreground mt-2">
                Didesain khusus untuk menyelaraskan kecanggihan teknologi dengan
                kebutuhan riil di kelas.
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Fitur 1 */}
              <div className="p-6 rounded-2xl bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className="p-3 bg-emerald-50/10 text-emerald-600 w-fit rounded-xl  mb-4 flex items-center justify-center">
                  <Camera className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-lg text-foreground mb-2">
                  Input Multimode Super Fleksibel
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Cukup foto buku paket, unggah gambar materi, ketik prompt
                  teks, atau input manual. AI langsung mengekstraknya menjadi
                  soal matang.
                </p>
              </div>
              {/* Fitur 2 */}
              <div className="p-6 rounded-2xl bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className="p-3 bg-emerald-50/10 text-emerald-600 w-fit rounded-xl  mb-4 flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-lg text-foreground mb-2">
                  Jenis Soal Terlengkap
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Bebas buat Pilihan Ganda, Benar/Salah, Menjodohkan (Matching),
                  hingga Esai dalam satu paket ujian yang terstruktur.
                </p>
              </div>
              {/* Fitur 3 */}
              <div className="p-6 rounded-2xl bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className="p-3 bg-emerald-50/10 text-emerald-600 w-fit rounded-xl  mb-4 flex items-center justify-center">
                  <Shuffle className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-lg text-foreground mb-2">
                  Anti-Contek Engine
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Fitur mengacak urutan soal dan opsi pilihan jawaban untuk
                  setiap siswa. Pelaksanaan ujian menjadi lebih mandiri, jujur,
                  dan objektif.
                </p>
              </div>
              {/* Fitur 4 */}
              <div className="p-6 rounded-2xl bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className="p-3 bg-emerald-50/10 text-emerald-600 w-fit rounded-xl  mb-4 flex items-center justify-center">
                  <Printer className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-lg text-foreground mb-2">
                  Ekspor Siap Cetak
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Sekali klik, ekspor seluruh bank soal Anda menjadi file PDF
                  atau Word dengan format margin dan penomoran yang rapi secara
                  otomatis.
                </p>
              </div>
              {/* Fitur 5 */}
              <div className="p-6 rounded-2xl bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className="p-3 bg-emerald-50/10 text-emerald-600 w-fit rounded-xl  mb-4 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-lg text-foreground mb-2">
                  Pusat Analisis Butir Soal
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Sistem otomatis mendeteksi tingkat kesulitan soal secara riil
                  berdasarkan jawaban siswa. Anda tahu pasti soal mana yang
                  memerlukan remedial kelas.
                </p>
              </div>
              {/* Fitur 6 */}
              <div className="p-6 rounded-2xl bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className="p-3 bg-emerald-50/10 text-emerald-600 w-fit rounded-xl  mb-4 flex items-center justify-center">
                  <Trophy className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-lg text-foreground mb-2">
                  Leaderboard Kompetitif
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Pacu motivasi belajar siswa dengan papan peringkat publik
                  pasca-ujian yang otomatis mengurutkan skor tertinggi dan waktu
                  tercepat.
                </p>
              </div>
            </div>
          </div>
        </section>
        {/* 4. SECTION CARA KERJA (Zero Friction) */}
        <section id="cara-kerja" className="reveal py-20 bg-muted/30 border-y">
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
                Hanya 3 Langkah Menuju Ujian yang Tangguh
              </h2>
              <p className="text-muted-foreground mt-2">
                Tanpa alur yang ribet, hemat waktu pengerjaan Anda secara
                instan.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8 relative">
              {/* Langkah 1 */}
              <div
                data-reveal
                className="flex flex-col items-center text-center relative group reveal-left"
              >
                <div className="w-16 h-16 rounded-2xl bg-background border border-border shadow-sm flex items-center justify-center text-primary font-bold text-xl mb-6 relative z-10 group-hover:border-primary transition-colors">
                  <UploadCloud className="w-7 h-7" />
                </div>
                <h3 className="font-bold text-lg text-foreground mb-2">
                  1. Unggah Materi
                </h3>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Masukkan bahan ajar Anda seperti foto halaman buku, ringkasan
                  teks, maupun instruksi prompt AI langsung.
                </p>
              </div>
              {/* Langkah 2 */}
              <div
                data-reveal
                className="flex flex-col items-center text-center relative group reveal-up"
              >
                <div className="w-16 h-16 rounded-2xl bg-background border border-border shadow-sm flex items-center justify-center text-primary font-bold text-xl mb-6 relative z-10 group-hover:border-primary transition-colors">
                  <Sliders className="w-7 h-7" />
                </div>
                <h3 className="font-bold text-lg text-foreground mb-2">
                  2. Validasi & Kustomisasi
                </h3>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Biarkan AI men-generate soal, lakukan review, sesuaikan bobot
                  kesulitan (HOTS), dan aktifkan fitur acak jawaban.
                </p>
              </div>
              {/* Langkah 3 */}
              <div
                data-reveal
                className="flex flex-col items-center text-center relative group reveal-right"
              >
                <div className="w-16 h-16 rounded-2xl bg-background border border-border shadow-sm flex items-center justify-center text-primary font-bold text-xl mb-6 relative z-10 group-hover:border-primary transition-colors">
                  <Share2 className="w-7 h-7" />
                </div>
                <h3 className="font-bold text-lg text-foreground mb-2">
                  3. Bagikan & Pantau
                </h3>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Kirim token ujian ke siswa, biarkan sistem menilai otomatis,
                  dan lihat laporan analisis butir soal secara instan.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 5. SECTION TESTIMONI (Social Proof) */}
        <section id="testimoni" className=" py-24 bg-background">
          <div
            data-reveal
            className="container mx-auto px-4 max-w-4xl reveal-rotate"
          >
            <div className="bg-card text-primary-foreground rounded-3xl p-8 md:p-12 shadow-xl relative overflow-hidden">
              {/* Kutipan besar ikon dekorasi */}
              <span className="absolute top-6 left-6 text-primary-foreground/10 font-serif text-8xl pointer-events-none select-none">
                “
              </span>
              <div className="relative z-10 flex flex-col items-center text-center">
                <div className="flex items-center text-yellow-400 mb-6">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-current" />
                  ))}
                </div>
                <blockquote className="text-lg md:text-xl font-medium leading-relaxed mb-6 text-primary italic">
                  &quot;Dulu saya harus menghabiskan waktu libur akhir pekan
                  hanya untuk menyusun soal Penilaian Akhir Semester. Sejak
                  menggunakan Epalio, saya bisa membuat 40 soal pilihan ganda
                  berbobot HOTS hanya dalam waktu kurang dari 5 menit sambil
                  minum teh hangat. Fitur analisis butir soalnya sangat membantu
                  rapat evaluasi sekolah!&quot;
                </blockquote>
                <div className="border-t border-primary-foreground/20 pt-4 w-full max-w-xs">
                  <p className="font-extrabold text-primary">
                    Leonardo De Santos, S.Pd.
                  </p>
                  <p className="text-xs text-primary/80">Guru Sejarah SMA</p>
                </div>
              </div>
              {/* Decorative element */}
              <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-primary-foreground/10 rounded-full blur-2xl" />
            </div>
          </div>
        </section>
        {/* 6. FINAL CTA */}
        <section className=" py-24 bg-muted/50 text-foreground border-t relative overflow-hidden">
          <div
            data-reveal
            className="container mx-auto px-4 max-w-4xl text-center relative z-10 reveal-up"
          >
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4 text-foreground">
              Kembalikan Waktu Luang Anda yang Berharga
            </h2>
            <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
              Bergabunglah dengan ribuan pendidik cerdas lainnya yang telah
              beralih ke era asesmen digital otomatis yang tangguh, hemat biaya,
              dan bebas stres.
            </p>
            <div className="flex flex-col items-center gap-4">
              <Button
                size="lg"
                className="h-14 px-10 text-lg font-bold  transition-all hover:-translate-y-0.5 shadow-primary/30 w-full sm:w-auto"
              >
                <Link href="/login">Buat Paket Soal Pertama Anda Sekarang</Link>
              </Button>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <span>
                  Gratis selamanya untuk fitur dasar. Mulai instan tanpa ribet.
                </span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t bg-background py-8">
        <div className="container mx-auto max-w-7xl px-4 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Epalio</p>
        </div>
      </footer>
    </div>
  );
}

function SparklesIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      <path d="M5 3v4" />
      <path d="M19 17v4" />
      <path d="M3 5h4" />
      <path d="M17 19h4" />
    </svg>
  );
}
