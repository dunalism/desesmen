import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  {}: { params: Promise<{ id: string }> },
) {
  try {
    const body = await request.json();
    const { attemptId, questionId, scoreEssay } = body;

    if (!attemptId || !questionId || scoreEssay === undefined) {
      return NextResponse.json(
        {
          error:
            "Parameter 'attemptId', 'questionId', dan 'scoreEssay' wajib disertakan.",
        },
        { status: 400 },
      );
    }

    // Eksekusi pembaruan dalam prisma.$transaction
    const updatedAttempt = await prisma.$transaction(async (tx) => {
      // 1. Cari StudentAnswer yang sesuai
      const studentAnswer = await tx.studentAnswer.findFirst({
        where: {
          attemptId,
          questionId,
        },
      });

      if (!studentAnswer) {
        throw new Error("Jawaban siswa tidak ditemukan.");
      }

      // 2. Update isCorrect (benar/salah) berdasarkan scoreEssay (misal jika >= 50 dianggap benar)
      const isCorrectValue = scoreEssay >= 50;
      await tx.studentAnswer.update({
        where: { id: studentAnswer.id },
        data: { isCorrect: isCorrectValue },
      });

      // 3. Ambil seluruh rincian jawaban untuk attempt tersebut untuk menghitung ulang skor
      const allAnswers = await tx.studentAnswer.findMany({
        where: { attemptId },
      });

      const correctCount = allAnswers.filter(
        (ans) => ans.isCorrect === true,
      ).length;
      const totalAnswers = allAnswers.length;
      const calculatedScore =
        totalAnswers > 0 ? Math.round((correctCount / totalAnswers) * 100) : 0;

      // 4. Update ExamAttempt dengan nilai dan status grading baru
      const attempt = await tx.examAttempt.update({
        where: { id: attemptId },
        data: {
          score: calculatedScore,
          isGraded: true,
        },
      });

      return attempt;
    });

    return NextResponse.json({
      success: true,
      message:
        "Nilai esai berhasil disimpan dan skor total telah dikalkulasi ulang.",
      data: updatedAttempt,
    });
  } catch (error) {
    console.error("Error grading essay:", error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Terjadi kesalahan internal server.";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
