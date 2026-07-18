import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { Prisma } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, title, questionIds } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized. Missing userId." },
        { status: 401 },
      );
    }

    if (!title || !title.trim()) {
      return NextResponse.json(
        { error: "Judul paket baru diperlukan." },
        { status: 400 },
      );
    }

    if (
      !questionIds ||
      !Array.isArray(questionIds) ||
      questionIds.length === 0
    ) {
      return NextResponse.json(
        { error: "Tidak ada butir soal yang dipilih." },
        { status: 400 },
      );
    }

    // 1. Ambil data soal asli beserta opsinya dalam 1 kueri
    const originalQuestions = await prisma.question.findMany({
      where: { id: { in: questionIds } },
      include: { options: true },
    });

    if (originalQuestions.length === 0) {
      throw new Error("Butir soal yang dipilih tidak ditemukan di database.");
    }

    // Tentukan tipe soal kumulatif (MULTIPLE_CHOICE, TRUE_FALSE, dll)
    const uniqueTypes = Array.from(
      new Set(originalQuestions.map((q) => q.type)),
    );
    const questionType = uniqueTypes.length === 1 ? uniqueTypes[0] : "MIXED";

    // 2. Jalankan transaksi FLAT BULK INSERT (Sangat Ringan & Cepat)
    const newAssessment = await prisma.$transaction(
      async (tx) => {
        // Operasi A: Buat data induk Assessment
        const assessment = await tx.assessment.create({
          data: {
            userId,
            inputType: "TEXT",
            title: title.trim(),
            questionType,
            questionCount: originalQuestions.length,
            difficulty: "MEDIUM",
          },
        });

        const preparedQuestions: Prisma.QuestionCreateManyInput[] = [];
        const preparedOptions: Prisma.OptionCreateManyInput[] = [];

        // Operasi B: Petakan data menggunakan forEach biasa (bukan loop asynchronous)
        originalQuestions.forEach((origQ, i) => {
          const newQuestionId = crypto.randomUUID(); // Buat ID manual di server Next.js

          preparedQuestions.push({
            id: newQuestionId,
            assessmentId: assessment.id,
            questionText: origQ.questionText,
            type: origQ.type,
            order: i + 1,
            answerKey: origQ.answerKey,
          });

          if (origQ.type === "MULTIPLE_CHOICE" && origQ.options) {
            origQ.options.forEach((opt) => {
              preparedOptions.push({
                questionId: newQuestionId, // Hubungkan langsung dengan ID soal baru di atas
                optionText: opt.optionText,
                isCorrect: opt.isCorrect,
              });
            });
          }
        });

        // Operasi C: Tembak kueri massal ke MySQL (Hanya 2 kueri flat tambahan)
        if (preparedQuestions.length > 0) {
          await tx.question.createMany({ data: preparedQuestions });
        }

        if (preparedOptions.length > 0) {
          await tx.option.createMany({ data: preparedOptions });
        }

        return assessment;
      },
      {
        timeout: 20000,
      },
    );

    return NextResponse.json({ success: true, id: newAssessment.id });
  } catch (error: unknown) {
    console.error("Kompilasi remix error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Internal Server Error", message: errorMessage },
      { status: 500 },
    );
  }
}
