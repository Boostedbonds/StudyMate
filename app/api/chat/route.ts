import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type Mode = "teacher" | "examiner" | "oral" | "progress";

function buildSystemPrompt(mode: Mode): string {
  switch (mode) {
    case "teacher":
      return "You are StudyMate in TEACHER mode. Explain clearly, step by step, CBSE style.";
    case "examiner":
      return "You are StudyMate in EXAMINER mode. Ask one question at a time. Evaluate strictly.";
    case "oral":
      return "You are StudyMate in ORAL mode. Ask short oral questions and give quick feedback.";
    case "progress":
      return "You are StudyMate in PROGRESS mode. Summarize performance only.";
    default:
      return "You are StudyMate.";
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY missing" },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body?.mode || !body?.message?.trim()) {
      return NextResponse.json(
        { error: "Invalid request" },
        { status: 400 }
      );
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text:
                    buildSystemPrompt(body.mode) +
                    "\n\nStudent says:\n" +
                    body.message,
                },
              ],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      return NextResponse.json({ error: err }, { status: 500 });
    }

    const data = await response.json();
    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ??
      "No response generated.";

    return NextResponse.json({ reply });
  } catch {
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
