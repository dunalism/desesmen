import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { IncomingOption, IncomingQuestion } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET - Fetch Assessment by ID with Questions & Options
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const assessment = await prisma.assessment.findUnique({
      where: { id },
      include: {
        questions: {
          orderBy: { order: "asc" },
          include: {
            options: true,
          },
        },
      },
    });

    if (!assessment) {
      return NextResponse.json(
        { error: "Assessment not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, assessment });
  } catch (error: unknown) {
    console.error("Fetch assessment error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Internal Server Error", message: errorMessage },
      { status: 500 },
    );
  }
}

// PUT - Update Questions & Options for an Assessment (Save to Bank Soal)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { questions } = body; // Array berisi objek soal hasil edit

    // 1. Validasi keberadaan assessment
    const assessmentExists = await prisma.assessment.findUnique({
      where: { id },
    });

    if (!assessmentExists) {
      return NextResponse.json(
        { error: "Assessment not found." },
        { status: 404 },
      );
    }

    await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        // Langkah A: Hapus semua pertanyaan lama (Opsi terhapus otomatis via Cascade Delete)
        await tx.question.deleteMany({
          where: { assessmentId: id },
        });

        if (questions && Array.isArray(questions)) {
          // MENGGUNAKAN TIPE DATA BAWAAN PRISMA (Menghilangkan any[])
          const preparedQuestions: Prisma.QuestionCreateManyInput[] = [];
          const preparedOptions: Prisma.OptionCreateManyInput[] = [];

          // Langkah B: Petakan data ke dalam array flat & generate ID secara manual
          (questions as IncomingQuestion[]).forEach((q, index) => {
            const generatedQuestionId = crypto.randomUUID(); // Buat UUID di server

            preparedQuestions.push({
              id: generatedQuestionId, // Pasang ID manual
              assessmentId: id,
              questionText: q.questionText,
              type: q.type, // Sudah aman sesuai Enum QuestionType Prisma
              order: index + 1,
              answerKey: q.answerKey,
            });

            // Jika tipe pilihan ganda, kumpulkan semua opsinya ke array terpisah
            if (
              q.type === "MULTIPLE_CHOICE" &&
              q.options &&
              Array.isArray(q.options)
            ) {
              q.options.forEach((opt: IncomingOption) => {
                preparedOptions.push({
                  questionId: generatedQuestionId, // Hubungkan ke ID soal di atas
                  optionText: opt.optionText,
                  isCorrect: opt.isCorrect,
                });
              });
            }
          });

          // Langkah C: Eksekusi Bulk Insert (Hanya 2 hit jaringan untuk simpan semuanya)
          if (preparedQuestions.length > 0) {
            await tx.question.createMany({
              data: preparedQuestions,
            });
          }

          if (preparedOptions.length > 0) {
            await tx.option.createMany({
              data: preparedOptions,
            });
          }
        }
      },
      {
        timeout: 20000,
      },
    );

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Update assessment error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Internal Server Error", message: errorMessage },
      { status: 500 },
    );
  }
}

// DELETE - Delete assessment
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // Verify assessment exists
    const assessmentExists = await prisma.assessment.findUnique({
      where: { id },
    });

    if (!assessmentExists) {
      return NextResponse.json(
        { error: "Assessment not found." },
        { status: 404 },
      );
    }

    await prisma.assessment.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Delete assessment error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Internal Server Error", message: errorMessage },
      { status: 500 },
    );
  }
}
