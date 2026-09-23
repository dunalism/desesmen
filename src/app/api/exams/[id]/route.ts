import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// PATCH - Mengupdate status aktif/nonaktif sesi ujian (Tutup Ujian) atau status leaderboard
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { isActive, showLeaderboard } = body;

    if (isActive === undefined && showLeaderboard === undefined) {
      return NextResponse.json(
        { error: "Parameter 'isActive' atau 'showLeaderboard' wajib disertakan." },
        { status: 400 },
      );
    }

    const updateData: any = {};
    if (isActive !== undefined) {
      updateData.isActive = !!isActive;
    }
    if (showLeaderboard !== undefined) {
      updateData.showLeaderboard = !!showLeaderboard;
    }

    const exam = await prisma.exam.update({
      where: { id },
      data: updateData,
    });

    // Revalidasi cache statis pertanyaan agar perubahan status langsung ter-apply
    try {
      revalidatePath(`/api/exams/${exam.token}/questions`);
    } catch (cacheError) {
      console.warn(`Gagal merevalidasi cache:`, cacheError);
    }

    return NextResponse.json({
      success: true,
      message: "Sesi ujian berhasil diperbarui.",
      data: exam,
    });
  } catch (error) {
    console.error("Error patching exam:", error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Terjadi kesalahan internal server.";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// DELETE - Menghapus sesi ujian dan menghapus file statis JSON-nya
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // 1. Ambil data token sebelum dihapus di database
    const exam = await prisma.exam.findUnique({
      where: { id },
      select: { token: true },
    });

    if (!exam) {
      return NextResponse.json(
        { error: "Sesi ujian tidak ditemukan." },
        { status: 404 },
      );
    }

    const { token } = exam;

    // 2. Hapus data dari database (cascade onDelete terpasang pada skema Prisma)
    await prisma.exam.delete({
      where: { id },
    });

    // 3. Revalidasi cache statis pertanyaan di Next.js Route Cache
    try {
      revalidatePath(`/api/exams/${token}/questions`);
    } catch (cacheError) {
      console.warn(
        `Gagal merevalidasi cache /api/exams/${token}/questions:`,
        cacheError,
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "Sesi ujian beserta seluruh data pengerjaan siswa dan cache statis berhasil dihapus.",
    });
  } catch (error) {
    console.error("Error deleting exam:", error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Terjadi kesalahan internal server.";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
