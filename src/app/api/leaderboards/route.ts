import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const exams = await prisma.exam.findMany({
      where: {
        isActive: false,
        showLeaderboard: true,
      },
      select: {
        id: true,
        title: true,
        token: true,
        duration: true,
        startTime: true,
        endTime: true,
        isActive: true,
        showLeaderboard: true,
        assessment: {
          select: {
            questionCount: true,
          },
        },
        _count: {
          select: {
            attempts: true,
          },
        },
      },
      orderBy: {
        endTime: "desc",
      },
    });

    return NextResponse.json(exams, { status: 200 });
  } catch (error) {
    console.error("Error fetching leaderboards:", error);
    return NextResponse.json(
      { error: "Gagal mengambil daftar papan peringkat." },
      { status: 500 },
    );
  }
}
