import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Fungsi pembuat token alfanumerik 6 karakter yang unik dan aman dari tabrakan (collision-free)
async function generateUniqueToken(): Promise<string> {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Menghindari O, 0, I, 1 agar tidak membingungkan siswa
  let token = "";
  let isUnique = false;

  while (!isUnique) {
    token = "";
    for (let i = 0; i < 6; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // Cek tabrakan token di database
    const existing = await prisma.exam.findUnique({
      where: { token },
    });

    if (!existing) {
      isUnique = true;
    }
  }

  return token;
}

// POST - Membuat sesi ujian baru (Exam) dan menghasilkan berkas static JSON
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      userId,
      assessmentId,
      title,
      duration,
      startTime,
      endTime,
      showLeaderboard = true,
      shuffleQuestions = false,
      shuffleOptions = false,
    } = body;

    // 1. Validasi Kehadiran Input Utama
    if (
      !userId ||
      !assessmentId ||
      !title ||
      duration === undefined ||
      !startTime ||
      !endTime
    ) {
      return NextResponse.json(
        {
          error: "Data input tidak lengkap. Pastikan semua field wajib terisi.",
        },
        { status: 400 },
      );
    }

    // 2. Validasi Tipe Data Durasi
    const parsedDuration = parseInt(String(duration), 10);
    if (isNaN(parsedDuration) || parsedDuration <= 0) {
      return NextResponse.json(
        { error: "Durasi harus berupa angka bulat positif dalam menit." },
        { status: 400 },
      );
    }

    // 3. Validasi Keabsahan Tanggal
    const parsedStart = new Date(startTime);
    const parsedEnd = new Date(endTime);
    if (isNaN(parsedStart.getTime()) || isNaN(parsedEnd.getTime())) {
      return NextResponse.json(
        { error: "Format tanggal startTime atau endTime tidak valid." },
        { status: 400 },
      );
    }

    if (parsedStart >= parsedEnd) {
      return NextResponse.json(
        {
          error:
            "Waktu mulai ujian (startTime) harus lebih awal daripada waktu selesai (endTime).",
        },
        { status: 400 },
      );
    }

    // 4. Validasi Kepemilikan Paket Soal (Assessment) oleh User
    const assessmentExists = await prisma.assessment.findFirst({
      where: {
        id: assessmentId,
        userId: userId,
      },
    });

    if (!assessmentExists) {
      return NextResponse.json(
        {
          error:
            "Paket soal tidak ditemukan atau Anda tidak memiliki akses ke paket soal ini.",
        },
        { status: 403 },
      );
    }

    // 5. Membuat Token Ujian Unik
    const token = await generateUniqueToken();

    // 6. Menyimpan Data Sesi Ujian di Database
    const exam = await prisma.exam.create({
      data: {
        assessmentId,
        title: title.trim(),
        token,
        duration: parsedDuration,
        startTime: parsedStart,
        endTime: parsedEnd,
        isActive: true,
        showLeaderboard: !!showLeaderboard,
        shuffleQuestions: !!shuffleQuestions,
        shuffleOptions: !!shuffleOptions,
      },
    });

    // 7. Pemicu pembuatan Next.js Route Cache / ISR secara instan (Warm Cache)
    try {
      const requestUrl = new URL(request.url);
      const warmCacheUrl = `${requestUrl.origin}/api/exams/${token}/questions`;
      // Melakukan fetch internal agar Vercel / Next.js mem-build cache statisnya saat ini juga
      await fetch(warmCacheUrl);
    } catch (cacheError) {
      console.warn("Gagal melakukan pre-warm cache soal:", cacheError);
    }

    // 8. Kembalikan Respon Sukses
    return NextResponse.json(
      {
        success: true,
        message: "Sesi ujian berhasil diaktifkan.",
        data: exam,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error creating exam session:", error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Terjadi kesalahan internal server.";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// GET - Mengambil daftar sesi ujian (Exams) terhubung dengan assessment milik user dengan paginasi
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized. Missing userId." },
        { status: 400 },
      );
    }

    const page = Number(searchParams.get("page") || "1");
    const limit = Number(searchParams.get("limit") || "6");
    const skip = (page - 1) * limit;

    const whereClause = {
      assessment: {
        userId: userId,
      },
    };

    const exams = await prisma.exam.findMany({
      where: whereClause,
      include: {
        assessment: {
          select: {
            title: true,
            questionCount: true,
            questionType: true,
          },
        },
        _count: {
          select: {
            attempts: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: skip,
    });

    const totalCount = await prisma.exam.count({
      where: whereClause,
    });

    const hasMore = skip + exams.length < totalCount;

    return NextResponse.json({
      success: true,
      exams,
      totalCount,
      hasMore,
      nextPage: hasMore ? page + 1 : null,
    });
  } catch (error) {
    console.error("Error fetching exams:", error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Terjadi kesalahan internal server.";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
