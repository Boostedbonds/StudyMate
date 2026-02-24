import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, StandardFonts } from "pdf-lib";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const content: string = body?.content || "No content";

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4 size

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const fontSize = 12;
    const { height } = page.getSize();

    const lines = content.split("\n");

    let y = height - 40;

    for (const line of lines) {
      page.drawText(line, {
        x: 40,
        y,
        size: fontSize,
        font,
      });
      y -= 16;

      if (y < 40) break; // prevent overflow
    }

    const pdfBytes = await pdfDoc.save();

    // ✅ FIX: Convert Uint8Array → Buffer (Node compatible)
    const buffer = Buffer.from(pdfBytes);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "attachment; filename=shauri-exam-paper.pdf",
      },
    });
  } catch (error) {
    console.error("PDF API Error:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}