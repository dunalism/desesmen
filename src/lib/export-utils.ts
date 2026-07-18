import {
  Document,
  Packer,
  Paragraph,
  Run,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
  PageBreak,
} from "docx";
import { ExportQuestion } from "@/lib/types";

// Helper to shuffle an array
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Generate the complete HTML content optimized for either Print/PDF or MS Word
export function generateAssessmentHtml(
  questions: ExportQuestion[],
  title: string = "Lembar Soal",
  isWord: boolean = false,
): string {
  const displayTitle = title && title.trim() ? title : "Lembar Soal";

  // 1. Group questions by type
  const mcQs = questions.filter((q) => q.type === "MULTIPLE_CHOICE");
  const tfQs = questions.filter((q) => q.type === "TRUE_FALSE");
  const matchQs = questions.filter((q) => q.type === "MATCHING");
  const essayQs = questions.filter((q) => q.type === "SHORT_ANSWER");

  let bodyHtml = "";
  let keyHtml = "";

  // Helper to generate the header for each section
  function getSectionHeader(
    letter: string,
    titleText: string,
    instruction: string,
  ): string {
    return `
      <div style="margin-top: 24px; margin-bottom: 16px; page-break-inside: avoid; -webkit-column-break-inside: avoid;">
        <h3 style="font-size: 12pt; font-family: 'Times New Roman', Times, serif; font-weight: bold; margin: 0; text-transform: uppercase;">
          Bagian ${letter}: ${titleText}
        </h3>
        <p style="font-size: 12pt; font-family: 'Times New Roman', Times, serif; font-style: italic; margin: 4px 0 0 0;">
          "${instruction}"
        </p>
      </div>
    `;
  }

  // --- BAGIAN A: PILIHAN GANDA ---
  if (mcQs.length > 0) {
    bodyHtml += getSectionHeader(
      "A",
      "Pilihan Ganda",
      "Pilihlah salah satu jawaban yang paling tepat!",
    );

    let mcContent = "";
    mcQs.forEach((q, idx) => {
      // Determine layout based on choice lengths (27 characters rule)
      const hasLongOption = q.options.some((opt) => opt.optionText.length > 27);
      let optionsRender = "";

      if (hasLongOption) {
        // Vertical layout
        optionsRender = `<div style="margin-top: 6px; padding-left: 15px; font-family: 'Times New Roman', Times, serif; font-size: 12pt;">`;
        q.options.forEach((opt, optIdx) => {
          const letter = String.fromCharCode(97 + optIdx); // a, b, c, d, e
          optionsRender += `
            <div style="margin-bottom: 4px; line-height: 1.4;">
              <span style="font-weight: normal; margin-right: 6px;">${letter}.</span>${opt.optionText}
            </div>
          `;
        });
        optionsRender += `</div>`;
      } else {
        // Two columns side-by-side: a, b, c on left, d, e on right (if 5 options) or a, b on left, c, d on right (if 4 options)
        const optsCount = q.options.length;
        const leftCount = optsCount === 5 ? 3 : 2;

        optionsRender += `
          <table style="width: 100%; border-collapse: collapse; border: none; margin-top: 6px; margin-left: 15px; font-family: 'Times New Roman', Times, serif; font-size: 12pt;">
            <tr>
              <td style="width: 50%; border: none; padding: 0; vertical-align: top;">
        `;

        // Left Column (a, b, c)
        for (let i = 0; i < leftCount; i++) {
          const letter = String.fromCharCode(97 + i);
          optionsRender += `
            <div style="margin-bottom: 4px; line-height: 1.4;">
              <span style="font-weight: normal; margin-right: 6px;">${letter}.</span>${q.options[i].optionText}
            </div>
          `;
        }

        optionsRender += `
              </td>
              <td style="width: 50%; border: none; padding: 0; vertical-align: top;">
        `;

        // Right Column (d, e)
        for (let i = leftCount; i < optsCount; i++) {
          const letter = String.fromCharCode(97 + i);
          optionsRender += `
            <div style="margin-bottom: 4px; line-height: 1.4;">
              <span style="font-weight: normal; margin-right: 6px;">${letter}.</span>${q.options[i].optionText}
            </div>
          `;
        }

        optionsRender += `
              </td>
            </tr>
          </table>
        `;
      }

      mcContent += `
        <div style="margin-bottom: 16px; page-break-inside: avoid; -webkit-column-break-inside: avoid; line-height: 1.5; font-family: 'Times New Roman', Times, serif; font-size: 12pt;">
          <table style="width: 100%; border-collapse: collapse; border: none;">
            <tr>
              <td style="width: 25px; border: none; padding: 0; vertical-align: top; font-weight: normal;">
                ${idx + 1}.
              </td>
              <td style="border: none; padding: 0; vertical-align: top; text-align: left;">
                ${q.questionText}
              </td>
            </tr>
          </table>
          ${optionsRender}
        </div>
      `;
    });
    bodyHtml += mcContent;

    // MC Keys
    keyHtml += `<div style="margin-bottom: 20px; page-break-inside: avoid; -webkit-column-break-inside: avoid;"><h4 style="font-size: 12pt; font-family: 'Times New Roman', Times, serif; font-weight: bold; margin-bottom: 8px;">Kunci Jawaban Bagian A: Pilihan Ganda</h4><div style="font-size: 12pt; font-family: 'Times New Roman', Times, serif; line-height: 1.5;">`;
    mcQs.forEach((q, idx) => {
      const correctIdx = q.options.findIndex((opt) => opt.isCorrect);
      const letter =
        correctIdx !== -1 ? String.fromCharCode(97 + correctIdx) : "a";
      keyHtml += `<div style="margin-bottom: 4px;"><strong>${idx + 1}.</strong> ${letter} (${q.answerKey})</div>`;
    });
    keyHtml += `</div></div>`;
  }

  // --- BAGIAN B: BENAR/SALAH ---
  if (tfQs.length > 0) {
    bodyHtml += getSectionHeader(
      "B",
      "Benar/Salah",
      "Lingkarilah huruf B jika pernyataan benar atau S jika salah!",
    );

    let tfContent = "";
    tfQs.forEach((q, idx) => {
      tfContent += `
        <div style="margin-bottom: 14px; page-break-inside: avoid; -webkit-column-break-inside: avoid; line-height: 1.5; font-family: 'Times New Roman', Times, serif; font-size: 12pt;">
          <table style="width: 100%; border-collapse: collapse; border: none;">
            <tr>
              <td style="width: 25px; border: none; padding: 0; vertical-align: top; font-weight: normal;">
                ${idx + 1}.
              </td>
              <td style="border: none; padding: 0; vertical-align: top; text-align: left;">
                ${q.questionText}
              </td>
              <td style="width: 80px; border: none; padding: 0; text-align: right; vertical-align: top; font-weight: bold;">
                [ B  -  S ]
              </td>
            </tr>
          </table>
        </div>
      `;
    });
    bodyHtml += tfContent;

    // TF Keys
    keyHtml += `<div style="margin-bottom: 20px; page-break-inside: avoid; -webkit-column-break-inside: avoid;"><h4 style="font-size: 12pt; font-family: 'Times New Roman', Times, serif; font-weight: bold; margin-bottom: 8px;">Kunci Jawaban Bagian B: Benar/Salah</h4><div style="font-size: 12pt; font-family: 'Times New Roman', Times, serif; line-height: 1.5;">`;
    tfQs.forEach((q, idx) => {
      keyHtml += `<div style="margin-bottom: 4px;"><strong>${idx + 1}.</strong> ${q.answerKey}</div>`;
    });
    keyHtml += `</div></div>`;
  }

  // --- BAGIAN C: MENJODOHKAN ---
  if (matchQs.length > 0) {
    bodyHtml += getSectionHeader(
      "C",
      "Menjodohkan",
      "Pasangkanlah pernyataan di Kolom Kiri dengan jawaban yang sesuai di Kolom Kanan!",
    );

    // Collect and shuffle responses
    const originalAnswers = matchQs.map((q) => q.answerKey);
    const shuffledAnswers = shuffleArray(originalAnswers);

    // Build side-by-side table
    let matchContent = `
      <div style="margin-bottom: 24px; page-break-inside: avoid; -webkit-column-break-inside: avoid;">
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12pt; font-family: 'Times New Roman', Times, serif; border: 1px solid #000000;">
          <thead>
            <tr style="background-color: #f3f4f6;">
              <th style="border: 1px solid #000000; padding: 8px; text-align: left; width: 50%; font-weight: bold;">KOLOM KIRI (PERNYATAAN)</th>
              <th style="border: 1px solid #000000; padding: 8px; text-align: left; width: 50%; font-weight: bold;">KOLOM KANAN (JAWABAN)</th>
            </tr>
          </thead>
          <tbody>
    `;

    matchQs.forEach((q, idx) => {
      const letter = String.fromCharCode(65 + idx); // A, B, C, D...
      const rightOptionText = shuffledAnswers[idx];
      matchContent += `
        <tr>
          <td style="border: 1px solid #000000; padding: 10px; vertical-align: top; line-height: 1.4;">
            <span style="font-weight: normal; margin-right: 6px;">${idx + 1}.</span>${q.questionText}
          </td>
          <td style="border: 1px solid #000000; padding: 10px; vertical-align: top; line-height: 1.4;">
            <span style="font-weight: bold; margin-right: 6px;">${letter}.</span>${rightOptionText}
          </td>
        </tr>
      `;
    });

    matchContent += `
          </tbody>
        </table>
      </div>
    `;
    bodyHtml += matchContent;

    // Matching Keys
    keyHtml += `<div style="margin-bottom: 20px; page-break-inside: avoid; -webkit-column-break-inside: avoid;"><h4 style="font-size: 12pt; font-family: 'Times New Roman', Times, serif; font-weight: bold; margin-bottom: 8px;">Kunci Jawaban Bagian C: Menjodohkan</h4><div style="font-size: 12pt; font-family: 'Times New Roman', Times, serif; line-height: 1.5;">`;
    matchQs.forEach((q, idx) => {
      // Find which letter corresponds to this q's actual answerKey
      const correctIdxInShuffled = shuffledAnswers.findIndex(
        (ans) => ans === q.answerKey,
      );
      const letter =
        correctIdxInShuffled !== -1
          ? String.fromCharCode(65 + correctIdxInShuffled)
          : "?";
      keyHtml += `<div style="margin-bottom: 4px;"><strong>No ${idx + 1}</strong> menjodohkan dengan huruf <strong>${letter}</strong> (${q.answerKey})</div>`;
    });
    keyHtml += `</div></div>`;
  }

  // --- BAGIAN D: URAIAN/ESAI ---
  if (essayQs.length > 0) {
    bodyHtml += getSectionHeader(
      "D",
      "Uraian/Esai",
      "Jawablah pertanyaan berikut dengan jelas!",
    );

    let essayContent = "";
    essayQs.forEach((q, idx) => {
      essayContent += `
        <div style="margin-bottom: 16px; page-break-inside: avoid; -webkit-column-break-inside: avoid; line-height: 1.5; font-family: 'Times New Roman', Times, serif; font-size: 12pt;">
          <table style="width: 100%; border-collapse: collapse; border: none;">
            <tr>
              <td style="width: 25px; border: none; padding: 0; vertical-align: top; font-weight: normal;">
                ${idx + 1}.
              </td>
              <td style="border: none; padding: 0; vertical-align: top; text-align: left;">
                ${q.questionText}
              </td>
            </tr>
          </table>
        </div>
      `;
    });
    bodyHtml += essayContent;

    // Essay Keys
    keyHtml += `<div style="margin-bottom: 20px; page-break-inside: avoid; -webkit-column-break-inside: avoid;"><h4 style="font-size: 12pt; font-family: 'Times New Roman', Times, serif; font-weight: bold; margin-bottom: 8px;">Kunci Jawaban Bagian D: Uraian/Esai</h4><div style="font-size: 12pt; font-family: 'Times New Roman', Times, serif; line-height: 1.5;">`;
    essayQs.forEach((q, idx) => {
      keyHtml += `
        <div style="margin-bottom: 12px;">
          <strong>No ${idx + 1}:</strong><br/>
          <div style="padding-left: 15px; margin-top: 4px; font-style: italic; color: #111827;">
            ${q.answerKey}
          </div>
        </div>
      `;
    });
    keyHtml += `</div></div>`;
  }

  // Combine document with styling. If exporting to Word, wrap with MS Office XML namespaces
  if (isWord) {
    return `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta charset="utf-8">
          <title>${displayTitle}</title>
          <!--[if gte mso 9]>
          <xml>
            <w:WordDocument>
              <w:View>Print</w:View>
              <w:Zoom>100</w:Zoom>
              <w:DoNotOptimizeForBrowser/>
            </w:WordDocument>
          </xml>
          <![endif]-->
          <style>
            @page Section1 {
              size: 595.3pt 841.9pt; /* A4 size */
              margin: 56.7pt 56.7pt 56.7pt 56.7pt; /* 2.0cm margins */
              mso-header-margin: 35.4pt;
              mso-footer-margin: 35.4pt;
              mso-paper-source: 0;
            }
            div.Section1 {
              page: Section1;
            }
            body {
              font-family: 'Times New Roman', Times, serif;
              font-size: 12pt;
              color: #000000;
              line-height: 1.5;
            }
            .main-header {
              text-align: center;
              border-bottom: 3px double #000000;
              padding-bottom: 10px;
              margin-bottom: 24px;
            }
            .main-header h1 {
              margin: 0;
              font-size: 16pt;
              font-family: 'Times New Roman', Times, serif;
              font-weight: bold;
              text-transform: uppercase;
            }
            .main-header p {
              margin: 4px 0 0 0;
              font-size: 10pt;
              font-family: 'Times New Roman', Times, serif;
              font-style: italic;
            }
          </style>
        </head>
        <body lang="ID-ID" style="tab-interval: 36.0pt;">
          <div class="Section1">
            <!-- Header Ujian -->
            <div class="main-header">
              <h1>${displayTitle}</h1>
              <p>Diekspor dari Epalio</p>
            </div>

            <!-- Konten Soal -->
            <div style="margin-bottom: 40px;">
              ${bodyHtml}
            </div>

            <!-- Kunci Jawaban (Halaman Baru) -->
            <br clear="all" style="page-break-before: always; mso-break-type: section-break;" />
            <div>
              <div class="main-header">
                <h1>KUNCI JAWABAN</h1>
                <p>Lembar Kunci Jawaban untuk: ${displayTitle}</p>
              </div>
              <div style="margin-top: 20px;">
                ${keyHtml}
              </div>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  // Fallback / standard print output
  return `
    <html>
      <head>
        <meta charset="utf-8">
        <title>${displayTitle}</title>
        <style>
          @page {
            size: A4;
            margin: 2cm;
          }
          body {
            font-family: 'Times New Roman', Times, serif;
            font-size: 12pt;
            color: #000000;
            line-height: 1.5;
            padding: 0;
            margin: 0;
          }
          h1, h2, h3, h4, h5, h6 {
            font-family: 'Times New Roman', Times, serif;
            color: #000000;
          }
          .main-header {
            text-align: center;
            border-bottom: 3px double #000000;
            padding-bottom: 10px;
            margin-bottom: 24px;
          }
          .main-header h1 {
            margin: 0;
            font-size: 16pt;
            font-weight: bold;
            text-transform: uppercase;
          }
          .main-header p {
            margin: 4px 0 0 0;
            font-size: 10pt;
            font-style: italic;
          }
          .no-print-btn {
            background-color: #2563eb;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            font-weight: bold;
            font-size: 11pt;
            cursor: pointer;
          }
          @media print {
            .no-print {
              display: none !important;
            }
          }
        </style>
      </head>
      <body>
        <!-- Print Trigger Bar (Non-Printable) -->
        <div class="no-print" style="background-color: #f3f4f6; border-bottom: 1px solid #e5e7eb; padding: 12px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 10pt; font-weight: bold; color: #4b5563;">PREVIEW CETAK SOAL (A4)</span>
          <button class="no-print-btn" onclick="window.print()">
            Cetak Halaman / Simpan ke PDF
          </button>
        </div>

        <!-- Header Ujian -->
        <div class="main-header">
          <h1>${displayTitle}</h1>
          <p>Diekspor dari Epalio</p>
        </div>

        <!-- Konten Soal -->
        <div style="margin-bottom: 40px;">
          ${bodyHtml}
        </div>

        <!-- Kunci Jawaban (Halaman Baru) -->
        <div style="page-break-before: always; margin-top: 40px;">
          <div class="main-header">
            <h1>KUNCI JAWABAN</h1>
            <p>Lembar Kunci Jawaban untuk: ${displayTitle}</p>
          </div>
          <div style="margin-top: 20px;">
            ${keyHtml}
          </div>
        </div>
      </body>
    </html>
  `;
}

function cleanHtml(text: string): string {
  if (!text) return "";
  return text
    .replace(/<\/?[^>]+(>|$)/g, "") // Hapus semua tag HTML
    .replace(/&nbsp;/g, " ")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/&/g, "&")
    .replace(/"/g, '"');
}

// Download the generated HTML as Microsoft Word format (.docx) using docx.js
export function downloadAsWord(
  questions: ExportQuestion[],
  title: string = "Lembar Soal",
) {
  const displayTitle = title && title.trim() ? title : "Lembar Soal";

  // Group questions by type
  const mcQs = questions.filter((q) => q.type === "MULTIPLE_CHOICE");
  const tfQs = questions.filter((q) => q.type === "TRUE_FALSE");
  const matchQs = questions.filter((q) => q.type === "MATCHING");
  const essayQs = questions.filter((q) => q.type === "SHORT_ANSWER");

  const children: (Paragraph | Table)[] = [];

  // 1. Header Utama (Times New Roman, Bold, 16pt = size 32)
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new Run({
          text: displayTitle.toUpperCase(),
          bold: true,
          size: 32, // 16pt
        }),
      ],
      spacing: { after: 120 },
    }),
  );

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new Run({
          text: "Diekspor dari Epalio",
          italics: true,
          size: 20, // 10pt
        }),
      ],
      spacing: { after: 360 },
    }),
  );

  // Border pemisah kop (double line border)
  children.push(
    new Paragraph({
      border: {
        bottom: {
          style: BorderStyle.DOUBLE,
          size: 24, // 3pt
          color: "000000",
          space: 1,
        },
      },
      spacing: { after: 360 },
    }),
  );

  // Helper untuk membuat section header
  function addSectionHeader(
    letter: string,
    titleText: string,
    instruction: string,
  ) {
    children.push(
      new Paragraph({
        children: [
          new Run({
            text: `BAGIAN ${letter}: ${titleText.toUpperCase()}`,
            bold: true,
            size: 24, // 12pt
          }),
        ],
        spacing: { before: 240, after: 60 },
        keepNext: true,
      }),
    );
    children.push(
      new Paragraph({
        children: [
          new Run({
            text: `"${instruction}"`,
            italics: true,
            size: 24, // 12pt
          }),
        ],
        spacing: { after: 240 },
        keepNext: true,
      }),
    );
  }

  // --- BAGIAN A: PILIHAN GANDA ---
  if (mcQs.length > 0) {
    addSectionHeader(
      "A",
      "Pilihan Ganda",
      "Pilihlah salah satu jawaban yang paling tepat!",
    );

    mcQs.forEach((q, idx) => {
      // Pertanyaan
      children.push(
        new Paragraph({
          children: [
            new Run({ text: `${idx + 1}.\t`, bold: false, size: 24 }),
            new Run({ text: cleanHtml(q.questionText), size: 24 }),
          ],
          indent: { left: 432, hanging: 432 },
          spacing: { before: 120, after: 120, line: 360 }, // 1.5 line spacing
          keepNext: true,
        }),
      );

      // Render Pilihan Ganda
      const hasLongOption = q.options.some((opt) => opt.optionText.length > 27);

      if (hasLongOption) {
        // Layout Vertikal (1 Kolom)
        q.options.forEach((opt, optIdx) => {
          const letter = String.fromCharCode(97 + optIdx); // a, b, c, d, e
          children.push(
            new Paragraph({
              children: [
                new Run({ text: `${letter}.\t`, size: 24 }),
                new Run({ text: cleanHtml(opt.optionText), size: 24 }),
              ],
              indent: { left: 720, hanging: 288 }, // Sejajar dengan teks pertanyaan (left 432), lalu menjorok ke kanan
              spacing: { after: 60, line: 360 },
            }),
          );
        });
      } else {
        // Layout 2 Kolom Sejajar menggunakan objek Table borderless
        const optsCount = q.options.length;
        const leftCount = optsCount === 5 ? 3 : Math.ceil(optsCount / 2);

        const leftColParagraphs: Paragraph[] = [];
        const rightColParagraphs: Paragraph[] = [];

        // Kolom Kiri (a, b, c)
        for (let i = 0; i < leftCount; i++) {
          const letter = String.fromCharCode(97 + i);
          leftColParagraphs.push(
            new Paragraph({
              children: [
                new Run({ text: `${letter}.\t`, size: 24 }),
                new Run({ text: cleanHtml(q.options[i].optionText), size: 24 }),
              ],
              indent: { left: 288, hanging: 288 },
              spacing: { after: 60, line: 360 },
            }),
          );
        }

        // Kolom Kanan (d, e)
        for (let i = leftCount; i < optsCount; i++) {
          const letter = String.fromCharCode(97 + i);
          rightColParagraphs.push(
            new Paragraph({
              children: [
                new Run({ text: `${letter}.\t`, size: 24 }),
                new Run({ text: cleanHtml(q.options[i].optionText), size: 24 }),
              ],
              indent: { left: 288, hanging: 288 },
              spacing: { after: 60, line: 360 },
            }),
          );
        }

        children.push(
          new Table({
            indent: { size: 432, type: WidthType.DXA },
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.NONE },
              bottom: { style: BorderStyle.NONE },
              left: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE },
              insideHorizontal: { style: BorderStyle.NONE },
              insideVertical: { style: BorderStyle.NONE },
            },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    children: leftColParagraphs,
                  }),
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    children: rightColParagraphs,
                  }),
                ],
              }),
            ],
          }),
        );
      }
    });
  }

  // --- BAGIAN B: BENAR/SALAH ---
  if (tfQs.length > 0) {
    addSectionHeader(
      "B",
      "Benar/Salah",
      "Lingkarilah huruf B jika pernyataan benar atau S jika salah!",
    );

    tfQs.forEach((q, idx) => {
      // Menggunakan Table borderless agar tanda [ B - S ] berbaris rapi di sebelah kanan
      children.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.NONE },
            bottom: { style: BorderStyle.NONE },
            left: { style: BorderStyle.NONE },
            right: { style: BorderStyle.NONE },
            insideHorizontal: { style: BorderStyle.NONE },
            insideVertical: { style: BorderStyle.NONE },
          },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  width: { size: 85, type: WidthType.PERCENTAGE },
                  children: [
                    new Paragraph({
                      children: [
                        new Run({ text: `${idx + 1}.\t`, size: 24 }),
                        new Run({ text: cleanHtml(q.questionText), size: 24 }),
                      ],
                      indent: { left: 432, hanging: 432 },
                      spacing: { line: 360 },
                    }),
                  ],
                }),
                new TableCell({
                  width: { size: 15, type: WidthType.PERCENTAGE },
                  children: [
                    new Paragraph({
                      children: [
                        new Run({ text: "[ B  -  S ]", bold: true, size: 24 }),
                      ],
                      alignment: AlignmentType.RIGHT,
                      spacing: { line: 360 },
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      );
    });
  }

  // --- BAGIAN C: MENJODOHKAN ---
  if (matchQs.length > 0) {
    addSectionHeader(
      "C",
      "Menjodohkan",
      "Pasangkanlah pernyataan di Kolom Kiri dengan jawaban yang sesuai di Kolom Kanan!",
    );

    const originalAnswers = matchQs.map((q) => q.answerKey);
    const shuffledAnswers = shuffleArray(originalAnswers);

    const tableRows: TableRow[] = [];

    // Header Tabel
    tableRows.push(
      new TableRow({
        tableHeader: true,
        children: [
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            shading: { fill: "F3F4F6" },
            children: [
              new Paragraph({
                children: [
                  new Run({
                    text: "KOLOM KIRI (PERNYATAAN)",
                    bold: true,
                    size: 24,
                  }),
                ],
                alignment: AlignmentType.CENTER,
                spacing: { before: 120, after: 120 },
              }),
            ],
          }),
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            shading: { fill: "F3F4F6" },
            children: [
              new Paragraph({
                children: [
                  new Run({
                    text: "KOLOM KANAN (JAWABAN)",
                    bold: true,
                    size: 24,
                  }),
                ],
                alignment: AlignmentType.CENTER,
                spacing: { before: 120, after: 120 },
              }),
            ],
          }),
        ],
      }),
    );

    // Baris-baris tabel
    matchQs.forEach((q, idx) => {
      const letter = String.fromCharCode(65 + idx); // A, B, C, D...
      const rightOptionText = shuffledAnswers[idx];

      tableRows.push(
        new TableRow({
          children: [
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  children: [
                    new Run({ text: `${idx + 1}.\t`, size: 24 }),
                    new Run({ text: cleanHtml(q.questionText), size: 24 }),
                  ],
                  indent: { left: 432, hanging: 432 },
                  spacing: { before: 120, after: 120, line: 360 },
                }),
              ],
            }),
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  children: [
                    new Run({ text: `${letter}.\t`, bold: true, size: 24 }),
                    new Run({ text: cleanHtml(rightOptionText), size: 24 }),
                  ],
                  indent: { left: 432, hanging: 432 },
                  spacing: { before: 120, after: 120, line: 360 },
                }),
              ],
            }),
          ],
        }),
      );
    });

    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
          bottom: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
          left: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
          right: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
          insideHorizontal: {
            style: BorderStyle.SINGLE,
            size: 4,
            color: "000000",
          },
          insideVertical: {
            style: BorderStyle.SINGLE,
            size: 4,
            color: "000000",
          },
        },
        rows: tableRows,
      }),
    );

    // Spasi setelah tabel menjodohkan
    children.push(
      new Paragraph({
        children: [],
        spacing: { after: 240 },
      }),
    );
  }

  // --- BAGIAN D: URAIAN/ESAI ---
  if (essayQs.length > 0) {
    addSectionHeader(
      "D",
      "Uraian/Esai",
      "Jawablah pertanyaan berikut dengan jelas!",
    );

    essayQs.forEach((q, idx) => {
      children.push(
        new Paragraph({
          children: [
            new Run({ text: `${idx + 1}.\t`, size: 24 }),
            new Run({ text: cleanHtml(q.questionText), size: 24 }),
          ],
          indent: { left: 432, hanging: 432 },
          spacing: { before: 120, after: 120, line: 360 },
        }),
      );
    });
  }

  // --- 5. PAGE BREAK RESMI WORD UNTUK KUNCI JAWABAN ---
  children.push(new Paragraph({ children: [new PageBreak()] }));

  // --- KUNCI JAWABAN (HALAMAN BARU) ---
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new Run({
          text: "KUNCI JAWABAN",
          bold: true,
          size: 32, // 16pt
        }),
      ],
      spacing: { after: 120 },
    }),
  );

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new Run({
          text: `Lembar Kunci Jawaban untuk: ${displayTitle}`,
          italics: true,
          size: 20, // 10pt
        }),
      ],
      spacing: { after: 360 },
    }),
  );

  children.push(
    new Paragraph({
      border: {
        bottom: {
          style: BorderStyle.DOUBLE,
          size: 24, // 3pt
          color: "000000",
          space: 1,
        },
      },
      spacing: { after: 360 },
    }),
  );

  // Kunci Jawaban Pilihan Ganda
  if (mcQs.length > 0) {
    children.push(
      new Paragraph({
        children: [
          new Run({
            text: "Kunci Jawaban Bagian A: Pilihan Ganda",
            bold: true,
            size: 24,
          }),
        ],
        spacing: { before: 240, after: 120 },
        keepNext: true,
      }),
    );

    mcQs.forEach((q, idx) => {
      const correctIdx = q.options.findIndex((opt) => opt.isCorrect);
      const letter =
        correctIdx !== -1 ? String.fromCharCode(97 + correctIdx) : "a";
      children.push(
        new Paragraph({
          children: [
            new Run({ text: `${idx + 1}.\t`, bold: true, size: 24 }),
            new Run({
              text: `${letter} (${cleanHtml(q.answerKey)})`,
              size: 24,
            }),
          ],
          indent: { left: 432, hanging: 432 },
          spacing: { after: 60, line: 360 },
        }),
      );
    });
  }

  // Kunci Jawaban Benar/Salah
  if (tfQs.length > 0) {
    children.push(
      new Paragraph({
        children: [
          new Run({
            text: "Kunci Jawaban Bagian B: Benar/Salah",
            bold: true,
            size: 24,
          }),
        ],
        spacing: { before: 240, after: 120 },
        keepNext: true,
      }),
    );

    tfQs.forEach((q, idx) => {
      children.push(
        new Paragraph({
          children: [
            new Run({ text: `${idx + 1}.\t`, bold: true, size: 24 }),
            new Run({ text: cleanHtml(q.answerKey), size: 24 }),
          ],
          indent: { left: 432, hanging: 432 },
          spacing: { after: 60, line: 360 },
        }),
      );
    });
  }

  // Kunci Jawaban Menjodohkan
  if (matchQs.length > 0) {
    children.push(
      new Paragraph({
        children: [
          new Run({
            text: "Kunci Jawaban Bagian C: Menjodohkan",
            bold: true,
            size: 24,
          }),
        ],
        spacing: { before: 240, after: 120 },
        keepNext: true,
      }),
    );

    const originalAnswers = matchQs.map((q) => q.answerKey);
    const shuffledAnswers = shuffleArray(originalAnswers);

    matchQs.forEach((q, idx) => {
      const correctIdxInShuffled = shuffledAnswers.findIndex(
        (ans) => ans === q.answerKey,
      );
      const letter =
        correctIdxInShuffled !== -1
          ? String.fromCharCode(65 + correctIdxInShuffled)
          : "?";

      children.push(
        new Paragraph({
          children: [
            new Run({ text: `No ${idx + 1}.\t`, bold: true, size: 24 }),
            new Run({ text: `Menjodohkan dengan huruf `, size: 24 }),
            new Run({ text: letter, bold: true, size: 24 }),
            new Run({ text: ` (${cleanHtml(q.answerKey)})`, size: 24 }),
          ],
          indent: { left: 432, hanging: 432 },
          spacing: { after: 60, line: 360 },
        }),
      );
    });
  }

  // Kunci Jawaban Esai
  if (essayQs.length > 0) {
    children.push(
      new Paragraph({
        children: [
          new Run({
            text: "Kunci Jawaban Bagian D: Uraian/Esai",
            bold: true,
            size: 24,
          }),
        ],
        spacing: { before: 240, after: 120 },
        keepNext: true,
      }),
    );

    essayQs.forEach((q, idx) => {
      children.push(
        new Paragraph({
          children: [
            new Run({ text: `No ${idx + 1}.\t`, bold: true, size: 24 }),
            new Run({ text: cleanHtml(q.answerKey), italics: true, size: 24 }),
          ],
          indent: { left: 432, hanging: 432 },
          spacing: { after: 120, line: 360 },
        }),
      );
    });
  }

  // Membuat Document asli docx
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: "Times New Roman",
            size: 24, // 12pt
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1134, // ~2cm
              bottom: 1134,
              left: 1134,
              right: 1134,
            },
          },
        },
        children: children,
      },
    ],
  });

  // Export as .docx via Packer
  Packer.toBlob(doc)
    .then((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      const safeTitle = displayTitle
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      a.download = `soal-${safeTitle || "export"}.docx`;

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    })
    .catch((error) => {
      console.error("Gagal mengekspor dokumen .docx:", error);
    });
}

// Open the print layout in a new window
export function openPrintLayout(
  questions: ExportQuestion[],
  title: string = "Lembar Soal",
) {
  const displayTitle = title && title.trim() ? title : "Lembar Soal";
  const htmlContent = generateAssessmentHtml(questions, displayTitle, false);
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    throw new Error(
      "Pop-up diblokir oleh browser. Silakan izinkan pop-up untuk mencetak.",
    );
  }
  printWindow.document.write(htmlContent);
  printWindow.document.close();
}
