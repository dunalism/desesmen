import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      studentName,
      studentId,
      examToken,
      answers,
      submittedAt,
      startedAt,
      durationSeconds,
    } = body;

    // 1. Validasi Kehadiran Input Utama
    if (!studentName || !examToken || !Array.isArray(answers)) {
      return NextResponse.json(
        { error: "Data input tidak lengkap atau tidak valid." },
        { status: 400 },
      );
    }

    const trimmedName = studentName.trim();
    if (!trimmedName) {
      return NextResponse.json(
        { error: "Nama siswa tidak boleh kosong." },
        { status: 400 },
      );
    }

    // 2. Ambil data Exam beserta seluruh soal dan opsi jawaban asli (0 query tambahan per soal / anti N+1)
    const exam = await prisma.exam.findUnique({
      where: { token: examToken },
      include: {
        assessment: {
          include: {
            questions: {
              include: {
                options: true,
              },
            },
          },
        },
      },
    });

    if (!exam) {
      return NextResponse.json(
        { error: "Sesi ujian tidak ditemukan." },
        { status: 444 }, // Gunakan status yang relevan atau 404
      );
    }

    // 3. Validasi Keaktifan Sesi Ujian
    if (!exam.isActive) {
      return NextResponse.json(
        { error: "Sesi ujian ini sudah ditutup atau tidak aktif." },
        { status: 403 },
      );
    }

    // 4. Validasi Batas Waktu dengan Toleransi (Grace Period 60 Detik)
    const now = new Date();
    const endTimeWithGrace = new Date(exam.endTime.getTime() + 60 * 1000);
    if (now > endTimeWithGrace) {
      return NextResponse.json(
        {
          error:
            "Waktu pengerjaan ujian telah berakhir (lewat batas toleransi pengiriman).",
        },
        { status: 403 },
      );
    }

    // 5. Validasi Anti Double-Submit (Mencegah pengiriman ganda)
    const existingAttempt = await prisma.examAttempt.findFirst({
      where: {
        examId: exam.id,
        studentName: trimmedName,
        ...(studentId ? { studentId: studentId.trim() } : {}),
      },
    });

    if (existingAttempt) {
      return NextResponse.json(
        { error: "Jawaban Anda sudah tersimpan sebelumnya." },
        { status: 409 },
      );
    }

    // 6. Server-side Autograding Logic
    let correctCount = 0;
    const questionsList = exam.assessment.questions;

    const autoGradedQuestions = questionsList.filter(
      (q) =>
        q.type === "MULTIPLE_CHOICE" ||
        q.type === "SHORT_ANSWER" ||
        q.type === "TRUE_FALSE" ||
        q.type === "MATCHING",
    );
    const totalAutoGraded = autoGradedQuestions.length;
    const hasManualQuestions = questionsList.some(
      (q) => q.type === "SHORT_ANSWER",
    );

    // Map jawaban siswa berdasarkan questionId untuk pencarian cepat O(1)
    const studentAnswerMap = new Map(
      answers.map((ans) => [ans.questionId, ans]),
    );

    // Menyusun detail student answers untuk insert massal
    const studentAnswersData = questionsList.map((question) => {
      const studentAns = studentAnswerMap.get(question.id);
      const chosenOptionId = studentAns?.chosenOptionId || null;
      const textAnswer = studentAns?.textAnswer || null;
      let isCorrect: boolean | null = null;

      if (question.type === "MULTIPLE_CHOICE") {
        // Cari opsi yang benar di database
        const correctOption = question.options.find((opt) => opt.isCorrect);
        if (correctOption) {
          isCorrect = chosenOptionId === correctOption.id;
          if (isCorrect) {
            correctCount++;
          }
        } else {
          isCorrect = false;
        }
      } else if (question.type === "TRUE_FALSE") {
        const correctKey = question.answerKey
          ? question.answerKey.trim().toLowerCase()
          : "";
        const studentKey = textAnswer ? textAnswer.trim().toLowerCase() : "";
        isCorrect = correctKey !== "" && studentKey === correctKey;
        if (isCorrect) {
          correctCount++;
        }
      } else if (question.type === "MATCHING") {
        const correctKey = question.answerKey
          ? question.answerKey.trim().toLowerCase()
          : "";
        const studentKey = textAnswer ? textAnswer.trim().toLowerCase() : "";
        isCorrect = correctKey !== "" && studentKey === correctKey;
        if (isCorrect) {
          correctCount++;
        }
      } else {
        // SHORT_ANSWER default diset false dan butuh penilaian manual
        isCorrect = false;
      }

      return {
        questionId: question.id,
        chosenOptionId,
        textAnswer,
        isCorrect,
      };
    });

    const score =
      totalAutoGraded > 0 ? (correctCount / totalAutoGraded) * 100 : 0;
    const isGraded = !hasManualQuestions;

    // 7. Prisma Atomic Transaction (All-or-Nothing)
    await prisma.$transaction(async (tx) => {
      // a. Buat entri baru di tabel ExamAttempt
      const attempt = await tx.examAttempt.create({
        data: {
          examId: exam.id,
          studentName: trimmedName,
          studentId: studentId ? studentId.trim() : null,
          startedAt: startedAt,
          submittedAt: submittedAt,
          durationSeconds: durationSeconds,
          score: Math.round(score),
          isGraded,
        },
      });

      // b. Buat entri detail jawaban siswa secara massal
      const answersPayload = studentAnswersData.map((ans) => ({
        attemptId: attempt.id,
        questionId: ans.questionId,
        chosenOptionId: ans.chosenOptionId,
        textAnswer: ans.textAnswer,
        isCorrect: ans.isCorrect,
      }));

      await tx.studentAnswer.createMany({
        data: answersPayload,
      });
    });

    // 8. Kembalikan respon sukses tanpa membocorkan nilai ke siswa (sesuai roadmap)
    return NextResponse.json({
      success: true,
      message: "Lembar jawaban berhasil disimpan.",
    });
  } catch (error) {
    console.error("Error submitting exam:", error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Terjadi kesalahan internal server.";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
