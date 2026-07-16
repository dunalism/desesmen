import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // 1. Ambil detail sesi ujian dan paket soal terkait
    const exam = await prisma.exam.findUnique({
      where: { id },
      include: {
        assessment: {
          include: {
            questions: {
              orderBy: { order: "asc" },
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
        { status: 404 },
      );
    }

    // 2. Ambil seluruh usaha pengerjaan (ExamAttempt) siswa
    const attempts = await prisma.examAttempt.findMany({
      where: { examId: id },
      orderBy: [{ score: "desc" }, { durationSeconds: "asc" }],
      include: {
        answers: {
          include: {
            question: true,
          },
        },
      },
    });

    // 3. Hitung ringkasan statistik kelas
    const totalAttempts = attempts.length;
    let averageScore = 0;
    let maxScore = 0;
    let minScore = totalAttempts > 0 ? 100 : 0;
    let gradedAttemptsCount = 0;

    const scoredAttempts = attempts.filter((att) => att.score !== null);
    if (scoredAttempts.length > 0) {
      gradedAttemptsCount = scoredAttempts.length;
      const scores = scoredAttempts.map((att) => att.score as number);
      const totalScore = scores.reduce((sum, s) => sum + s, 0);
      averageScore = Math.round((totalScore / gradedAttemptsCount) * 10) / 10;
      maxScore = Math.max(...scores);
      minScore = Math.min(...scores);
    } else {
      minScore = 0;
    }

    // 4. Analisis Butir Soal (Item Analysis)
    // Memetakan tingkat kesalahan untuk setiap pertanyaan
    const questions = exam.assessment.questions;
    const itemAnalysis = questions.map((question) => {
      // Ambil seluruh jawaban siswa untuk questionId ini
      const answersForQuestion = attempts.flatMap((att) =>
        att.answers.filter((ans) => ans.questionId === question.id),
      );

      const totalAnswers = answersForQuestion.length;
      const wrongAnswers = answersForQuestion.filter(
        (ans) => ans.isCorrect === false,
      ).length;

      const errorPercentage =
        totalAnswers > 0 ? Math.round((wrongAnswers / totalAnswers) * 100) : 0;

      return {
        questionId: question.id,
        questionText: question.questionText,
        type: question.type,
        order: question.order,
        wrongCount: wrongAnswers,
        totalCount: totalAnswers,
        errorPercentage,
        answerKey: question.answerKey,
        options: question.options.map((opt) => ({
          id: opt.id,
          optionText: opt.optionText,
          isCorrect: opt.isCorrect,
        })),
      };
    });

    return NextResponse.json({
      success: true,
      exam: {
        id: exam.id,
        title: exam.title,
        token: exam.token,
        duration: exam.duration,
        startTime: exam.startTime,
        endTime: exam.endTime,
        isActive: exam.isActive,
        assessmentTitle: exam.assessment.title,
        questionsCount: questions.length,
      },
      stats: {
        averageScore,
        maxScore,
        minScore,
        totalAttempts,
      },
      attempts: attempts.map((att) => ({
        id: att.id,
        studentName: att.studentName,
        studentId: att.studentId,
        startedAt: att.startedAt,
        submittedAt: att.submittedAt,
        durationSeconds: att.durationSeconds,
        score: att.score,
        isGraded: att.isGraded,
        answers: att.answers.map((ans) => ({
          id: ans.id,
          questionId: ans.questionId,
          chosenOptionId: ans.chosenOptionId,
          textAnswer: ans.textAnswer,
          isCorrect: ans.isCorrect,
          questionText: ans.question.questionText,
          questionType: ans.question.type,
          answerKey: ans.question.answerKey,
        })),
      })),
      itemAnalysis,
    });
  } catch (error) {
    console.error("Error fetching exam results:", error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Terjadi kesalahan internal server.";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
