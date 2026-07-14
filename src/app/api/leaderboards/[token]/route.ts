import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> | { token: string } },
) {
  try {
    // Resolve params if it's a Promise (Next.js 15 App Router standard)
    const resolvedParams = await params;
    const token = resolvedParams.token?.toUpperCase().trim();

    if (!token) {
      return NextResponse.json(
        { error: "Token tidak valid." },
        { status: 400 },
      );
    }

    const exam = await prisma.exam.findUnique({
      where: { token },
      include: {
        assessment: {
          select: {
            questionCount: true,
          },
        },
      },
    });

    if (!exam) {
      return NextResponse.json(
        { error: "Ujian tidak ditemukan." },
        { status: 404 },
      );
    }

    // if (exam.isActive) {
    //   return NextResponse.json(
    //     { error: "Papan peringkat belum tersedia karena ujian masih aktif." },
    //     { status: 403 },
    //   );
    // }

    if (!exam.showLeaderboard) {
      return NextResponse.json(
        { error: "Papan peringkat untuk ujian ini ditonaktifkan oleh guru." },
        { status: 403 },
      );
    }

    // Ambil data attempt yang terhubung dengan examId tersebut
    const attempts = await prisma.examAttempt.findMany({
      where: {
        examId: exam.id,
        submittedAt: { not: null }, // Hanya yang sudah dikirimkan
      },
      select: {
        id: true,
        studentName: true,
        studentId: true,
        score: true,
        durationSeconds: true,
        startedAt: true,
        submittedAt: true,
      },
      orderBy: [{ score: "desc" }, { durationSeconds: "asc" }],
    });

    return NextResponse.json(
      {
        exam: {
          id: exam.id,
          title: exam.title,
          token: exam.token,
          duration: exam.duration,
          startTime: exam.startTime,
          endTime: exam.endTime,
          questionCount: exam.assessment.questionCount,
        },
        attempts,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching leaderboard detail:", error);
    return NextResponse.json(
      { error: "Gagal mengambil detail papan peringkat." },
      { status: 500 },
    );
  }
}
