import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GoogleGenerativeAI, SchemaType, Schema } from "@google/generative-ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET - Ambil daftar Paket Soal (Assessments) ter-paginasi milik user tertentu
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

    const search = searchParams.get("search") || "";
    const difficulty = searchParams.get("difficulty") || "";
    const questionType = searchParams.get("questionType") || "";

    // Build Prisma query filter clauses
    const whereClause: {
      userId: string;
      difficulty?: "EASY" | "MEDIUM" | "HARD";
      questions?: {
        some: {
          type: "MULTIPLE_CHOICE" | "TRUE_FALSE" | "SHORT_ANSWER" | "MATCHING";
        };
      };
      OR?: Array<{
        rawInputText?: { contains: string };
        questions?: { some: { questionText: { contains: string } } };
      }>;
    } = {
      userId: userId,
    };

    if (difficulty) {
      whereClause.difficulty = difficulty as "EASY" | "MEDIUM" | "HARD";
    }

    if (questionType) {
      whereClause.questions = {
        some: {
          type: questionType as
            | "MULTIPLE_CHOICE"
            | "TRUE_FALSE"
            | "SHORT_ANSWER"
            | "MATCHING",
        },
      };
    }

    if (search) {
      whereClause.OR = [
        {
          rawInputText: {
            contains: search,
          },
        },
        {
          questions: {
            some: {
              questionText: {
                contains: search,
              },
            },
          },
        },
      ];
    }

    const assessments = await prisma.assessment.findMany({
      where: whereClause,
      include: {
        _count: {
          select: {
            questions: true,
          },
        },
        // Only fetch questions if searching, and only ones containing the search query
        questions: search
          ? {
              where: {
                questionText: {
                  contains: search,
                },
              },
              take: 2,
            }
          : undefined,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
      skip: skip,
    });

    const totalCount = await prisma.assessment.count({
      where: whereClause,
    });

    const hasMore = skip + assessments.length < totalCount;

    return NextResponse.json({
      success: true,
      assessments,
      totalCount,
      hasMore,
      nextPage: hasMore ? page + 1 : null,
    });
  } catch (error: unknown) {
    console.error("Fetch assessments error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Internal Server Error", message: errorMessage },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      userId,
      inputType,
      rawInputText,
      imageUrl,
      questionType,
      questionCount,
      difficulty,
      title,
      optionsCount,
      mixedMcCount,
      mixedTfCount,
      mixedSaCount,
      mixedMatchCount,
      isManual,
    } = body;

    const targetOptionsCount = Number(optionsCount) === 5 ? 5 : 4;

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized. Missing userId." },
        { status: 401 },
      );
    }

    // Jika membuat paket soal secara manual, buat data kosong di MySQL
    if (isManual) {
      const assessment = await prisma.assessment.create({
        data: {
          userId,
          title: title?.trim() || "Paket Soal Manual Baru",
          inputType: "TEXT",
          rawInputText: "Dibuat secara manual tanpa AI.",
          imageUrl: "",
          questionType: questionType || "MULTIPLE_CHOICE",
          questionCount: 0,
          difficulty: difficulty || "MEDIUM",
          questions: {
            create: [],
          },
        },
      });

      return NextResponse.json({ success: true, id: assessment.id });
    }

    if (!rawInputText || rawInputText.trim().length < 10) {
      return NextResponse.json(
        { error: "Materi input terlalu pendek untuk dianalisis oleh AI." },
        { status: 400 },
      );
    }

    // Check for Gemini API Key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "Kunci API Gemini belum dikonfigurasi. Silakan tambahkan GEMINI_API_KEY di file .env Anda.",
        },
        { status: 500 },
      );
    }

    // 1. Call Gemini AI first to generate structured questions
    const genAI = new GoogleGenerativeAI(apiKey);

    // 1. ISOLASI INSTRUKSI DAN ENUM SECARA DINAMIS
    let typeSpecificInstruction = "";
    let allowedTypes: string[] = [
      "MULTIPLE_CHOICE",
      "TRUE_FALSE",
      "SHORT_ANSWER",
      "MATCHING",
    ];
    let optionsDescription = `Pilihan jawaban (wajib berisi tepat ${targetOptionsCount} pilihan jika tipe MULTIPLE_CHOICE, selain itu wajib kosongkan/array kosong [])`;
    let answerKeyDescription = "Kunci jawaban yang tepat.";

    if (questionType === "MULTIPLE_CHOICE") {
      allowedTypes = ["MULTIPLE_CHOICE"]; // Mengunci Schema dari pembajakan tipe soal
      optionsDescription = `Wajib menghasilkan array berisi TEPAT ${targetOptionsCount} objek pilihan jawaban. Hanya boleh ada 1 pilihan yang benar ('isCorrect' bernilai true).`;
      answerKeyDescription =
        "Wajib diisi dengan teks 'optionText' dari pilihan yang benar (harus sama persis).";
      typeSpecificInstruction = `Anda WAJIB HANYA menghasilkan soal pilihan ganda (MULTIPLE_CHOICE). Setiap soal wajib memiliki tepat ${targetOptionsCount} pilihan jawaban. DILARANG KERAS menghasilkan tipe soal selain MULTIPLE_CHOICE.`;
    } else if (questionType === "TRUE_FALSE") {
      allowedTypes = ["TRUE_FALSE"];
      optionsDescription =
        "Wajib berupa array kosong []. Jangan isi apa pun di sini.";
      answerKeyDescription =
        "Wajib berupa string teks 'Benar' atau 'Salah' saja.";
      typeSpecificInstruction = `Anda WAJIB HANYA menghasilkan soal Benar/Salah (TRUE_FALSE). Field 'options' wajib berupa array kosong [], dan 'answerKey' harus diisi teks 'Benar' atau 'Salah'. DILARANG KERAS menghasilkan tipe soal selain TRUE_FALSE.`;
    } else if (questionType === "SHORT_ANSWER") {
      allowedTypes = ["SHORT_ANSWER"];
      optionsDescription =
        "Wajib berupa array kosong []. Jangan isi apa pun di sini.";
      answerKeyDescription =
        "Berisi teks jawaban singkat dan ringkas yang tepat berdasarkan materi.";
      typeSpecificInstruction = `Anda WAJIB HANYA menghasilkan soal isian/jawaban singkat (SHORT_ANSWER). Field 'options' wajib berupa array kosong [], dan 'answerKey' berisi teks jawaban singkat. DILARANG KERAS menghasilkan tipe soal selain SHORT_ANSWER.`;
    } else if (questionType === "MATCHING") {
      allowedTypes = ["MATCHING"];
      optionsDescription =
        "Wajib berupa array kosong []. Jangan isi apa pun di sini.";
      answerKeyDescription =
        "Berisi teks definisi/pasangan menjodohkan yang tepat di kolom kanan.";
      typeSpecificInstruction = `Anda WAJIB HANYA menghasilkan soal Menjodohkan (MATCHING). 'questionText' berisi istilah/premis (kolom kiri), 'options' wajib berupa array kosong [], dan 'answerKey' berisi definisi pasangannya yang tepat (kolom kanan). DILARANG KERAS menghasilkan tipe soal selain MATCHING.`;
    } else if (questionType === "MIXED") {
      const mc = Number(mixedMcCount) || 0;
      const tf = Number(mixedTfCount) || 0;
      const sa = Number(mixedSaCount) || 0;
      const match = Number(mixedMatchCount) || 0;
      typeSpecificInstruction = `Anda WAJIB menghasilkan komposisi tipe soal Campuran (MIXED) secara persis dengan rincian kuota berikut:
      * Tepat ${mc} soal Pilihan Ganda (MULTIPLE_CHOICE) dengan ${targetOptionsCount} pilihan jawaban.
      * Tepat ${tf} soal Benar/Salah (TRUE_FALSE).
      * Tepat ${sa} soal Uraian/Esai (SHORT_ANSWER).
      * Tepat ${match} soal Menjodohkan (MATCHING).
      Pastikan jumlah total kombinasi di atas bernilai tepat ${questionCount} soal.`;
    }

    // 2. SCHEMA DIBENTUK SECARA DINAMIS BERDASARKAN FILTER DI ATAS
    const responseSchema: Schema = {
      type: SchemaType.OBJECT,
      properties: {
        questions: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              questionText: { type: SchemaType.STRING },
              type: {
                type: SchemaType.STRING,
                format: "enum",
                enum: allowedTypes, // KUNCI UTAMA: Hanya enum yang diizinkan yang dikirim ke Gemini
                description: `Tipe soal yang wajib digunakan: ${allowedTypes.join(", ")}`,
              },
              options: {
                type: SchemaType.ARRAY,
                description: optionsDescription,
                items: {
                  type: SchemaType.OBJECT,
                  properties: {
                    optionText: { type: SchemaType.STRING },
                    isCorrect: { type: SchemaType.BOOLEAN },
                  },
                  required: ["optionText", "isCorrect"],
                },
              },
              answerKey: {
                type: SchemaType.STRING,
                description: answerKeyDescription,
              },
            },
            required: ["questionText", "type", "answerKey"],
          },
        },
      },
      required: ["questions"],
    };

    // 3. SYSTEM PROMPT BERSIH TANPA LOGIKA PERCABANGAN "JIKA"
    const systemPrompt = `Anda adalah seorang guru ahli pembuat asesmen pendidikan pintar.
Tugas Anda adalah membuat soal ujian berkualitas tinggi berdasarkan materi input teks yang diberikan oleh pengguna.

Aturan Pembuatan Soal:
1. Jumlah soal yang harus dihasilkan: TEPAT ${questionCount} soal.
2. Tingkat kesulitan soal: ${difficulty} (EASY: Fokus pada ingatan dan pemahaman dasar, MEDIUM: Fokus pada aplikasi dan analisis menengah, HARD: Fokus pada HOTS - Higher Order Thinking Skills, evaluasi, dan analisis mendalam).
3. Aturan Mutlak Tipe Soal:
${typeSpecificInstruction}
4. Semua teks soal, pilihan jawaban, dan kunci jawaban harus ditulis menggunakan Bahasa Indonesia yang baik, benar, baku, dan sesuai dengan materi input.
5. Hasilkan soal yang relevan, mendidik, dan terstruktur dengan baik sesuai dengan data materi.`;

    const model = genAI.getGenerativeModel({
      model: "gemini-3.1-flash-lite",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    });

    const result = await model.generateContent({
      contents: [
        { role: "user", parts: [{ text: `Materi:\n${rawInputText}` }] },
      ],
      systemInstruction: systemPrompt,
    });

    const responseText = result.response.text();
    if (!responseText) {
      throw new Error("Menerima respon kosong dari model Gemini AI.");
    }

    const parsedData = JSON.parse(responseText);
    const questionsList = parsedData.questions || [];

    if (!Array.isArray(questionsList) || questionsList.length === 0) {
      throw new Error(
        "Gagal menghasilkan pertanyaan yang valid dari Gemini AI.",
      );
    }

    // 2. Create the Assessment record and its questions/options atomically in MySQL using nested writes
    const assessment = await prisma.assessment.create({
      data: {
        userId,
        title: title || null,
        inputType: inputType === "IMAGE" ? "IMAGE" : "TEXT",
        rawInputText: rawInputText,
        imageUrl: inputType === "IMAGE" ? imageUrl : "",
        questionType: questionType || "MULTIPLE_CHOICE",
        questionCount: Number(questionCount) || 10,
        difficulty: difficulty || "MEDIUM",
        questions: {
          create: questionsList.map((q, i) => ({
            questionText: q.questionText,
            type: q.type as
              | "MULTIPLE_CHOICE"
              | "TRUE_FALSE"
              | "SHORT_ANSWER"
              | "MATCHING",
            order: i + 1,
            answerKey: q.answerKey,
            options:
              q.type === "MULTIPLE_CHOICE" &&
              q.options &&
              Array.isArray(q.options)
                ? {
                    create: q.options.map(
                      (opt: { optionText: string; isCorrect: boolean }) => ({
                        optionText: opt.optionText,
                        isCorrect: opt.isCorrect,
                      }),
                    ),
                  }
                : undefined,
          })),
        },
      },
    });

    return NextResponse.json({ success: true, id: assessment.id });
  } catch (error: unknown) {
    console.error("Create assessment error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Internal Server Error", message: errorMessage },
      { status: 500 },
    );
  }
}
