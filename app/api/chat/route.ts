import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type Mode = "teacher" | "examiner" | "oral" | "progress";

export async function POST(req: NextRequest) {
  try {
    const { message, mode } = await req.json();

    if (!message) {
      return NextResponse.json(
        { error: "Missing message" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing GEMINI_API_KEY" },
        { status: 500 }
      );
    }

    const prompt = `
You are StudyMate in ${mode ?? "teacher"} mode.
Respond clearly for a CBSE Class 9 student.

Student:
${message}
`;

    const res = await fetch(
      "https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-goog-api-key": apiKey,
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

    const raw = await res.text();

    if (!res.ok) {
      return NextResponse.json(
        {
          error: "Gemini API failed",
          status: res.status,
          detail: raw,
        },
        { status: 500 }
      );
    }

    const data = JSON.parse(raw);

    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ??
      "No response generated.";

    return NextResponse.json({ reply });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Server crash", detail: String(err) },
      { status: 500 }
    );
  }
}
