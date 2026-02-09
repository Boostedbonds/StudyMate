import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type Mode = "teacher" | "examiner" | "oral" | "progress";

export async function POST(req: NextRequest) {
  try {
    const { mode, message } = await req.json();

    if (!message || !process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "Missing message or API key" },
        { status: 400 }
      );
    }

    const prompt = `
You are StudyMate in ${mode?.toUpperCase() || "TEACHER"} mode.
Respond clearly for a CBSE Class 9 student.

Student question:
${message}
`;

    const res = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-goog-api-key": process.env.GEMINI_API_KEY!,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
        }),
      }
    );

    const text = await res.text();

    if (!res.ok) {
      return NextResponse.json(
        { error: "Gemini API failed", detail: text },
        { status: 500 }
      );
    }

    const data = JSON.parse(text);
    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ??
      "No response generated.";

    return NextResponse.json({ reply });
  } catch (err) {
    return NextResponse.json(
      { error: "Server crash", detail: String(err) },
      { status: 500 }
    );
  }
}
