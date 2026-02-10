import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Force Node runtime (required for pdf-parse & Buffer)
 */
export const runtime = "nodejs";

/**
 * Ensure API key exists
 */
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error("GEMINI_API_KEY is not defined");
}

const genAI = new GoogleGenerativeAI(apiKey);

/**
 * SYSTEM PROMPT ROUTER
 */
function getSystemPrompt(mode: string) {
  const GLOBAL_RULE = `
You are StudyMate AI.
You must respond ONLY to NCERT / CBSE academic questions.
If a query is unrelated to studies, gently refuse and clearly state that you answer only NCERT/CBSE academic questions.
`;

  if (mode === "teacher") {
    return `
${GLOBAL_RULE}
You are in TEACHER MODE.
- Follow NCERT strictly.
- Explain clearly.
- No tests or evaluation.
`;
  }

  if (mode === "examiner") {
    return `
${GLOBAL_RULE}
You are a STRICT but FAIR CBSE examiner.
- Never guess syllabus.
- Ask missing exam details ONLY ONCE.
- Generate paper ONLY after details + START/BEGIN.
- Remain silent after paper.
- Accept uploads as answer sheets.
- End exam on SUBMIT / DONE / STOP.
`;
  }

  if (mode === "oral") {
    return `
${GLOBAL_RULE}
You are in ORAL MODE.
- Conversational explanations only.
`;
  }

  if (mode === "progress") {
    return `
${GLOBAL_RULE}
You are in PROGRESS DASHBOARD MODE.
- Analytics only.
`;
  }

  return GLOBAL_RULE;
}

/**
 * REAL PDF EXTRACTION (CommonJS – safe)
 */
async function extractPdfText(base64Data: string): Promise<string | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pdfParse = require("pdf-parse");
    const buffer = Buffer.from(base64Data, "base64");
    const data = await pdfParse(buffer);
    return data?.text ? data.text.slice(0, 15000) : null;
  } catch (err) {
    console.error("PDF parse failed:", err);
    return null;
  }
}

/**
 * REAL IMAGE OCR USING GEMINI VISION
 */
async function extractImageText(
  base64Data: string,
  mimeType: string
): Promise<string | null> {
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-3-pro-preview",
    });

    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            { text: "Extract all readable text from this image." },
            {
              inlineData: {
                mimeType,
                data: base64Data,
              },
            },
          ],
        },
      ],
    });

    const text =
      result?.response?.candidates?.[0]?.content?.parts
        ?.map((p: any) => p.text)
        .join("") ?? null;

    return text ? text.slice(0, 12000) : null;
  } catch (err) {
    console.error("Image OCR failed:", err);
    return null;
  }
}

/**
 * POST HANDLER
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body || !Array.isArray(body.messages)) {
      return NextResponse.json(
        { reply: "Invalid request format." },
        { status: 200 }
      );
    }

    const mode = typeof body.mode === "string" ? body.mode : "teacher";
    let uploadedContent: string | null = null;

    /**
     * FILE HANDLING
     */
    if (
      body.uploadedFile &&
      typeof body.uploadedFile.base64 === "string"
    ) {
      const { type, name, base64 } = body.uploadedFile;

      // 📄 PDF
      if (type === "application/pdf") {
        const pdfText = await extractPdfText(base64);
        uploadedContent =
          pdfText ??
          `Student uploaded a PDF (${name}) but text could not be extracted.`;
      }

      // 🖼️ IMAGE
      if (type.startsWith("image/")) {
        const imageText = await extractImageText(base64, type);
        uploadedContent =
          imageText ??
          `Student uploaded an image (${name}). Some text may be unreadable.`;
      }
    }

    // Fallback (older stub support)
    if (!uploadedContent && typeof body.uploadedText === "string") {
      uploadedContent = body.uploadedText.trim();
    }

    const lastUserMessage =
      body.messages
        .slice()
        .reverse()
        .find(
          (m: any) =>
            m?.role === "user" && typeof m?.content === "string"
        )?.content ?? null;

    if (!lastUserMessage && !uploadedContent) {
      return NextResponse.json(
        { reply: "Please ask a valid academic question to continue." },
        { status: 200 }
      );
    }

    const systemPrompt = getSystemPrompt(mode);

    let finalUserInput = "";

    if (uploadedContent) {
      finalUserInput += `
[UPLOADED CONTENT]
${uploadedContent}
`;
    }

    if (lastUserMessage) {
      finalUserInput += `
[USER INPUT]
${lastUserMessage}
`;
    }

    const textModel = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
    });

    const result = await textModel.generateContent({
      contents: [
        { role: "user", parts: [{ text: systemPrompt }] },
        { role: "user", parts: [{ text: finalUserInput }] },
      ],
    });

    const reply =
      result?.response?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    return NextResponse.json({ reply }, { status: 200 });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { reply: "Something went wrong. Please try again later." },
      { status: 200 }
    );
  }
}
