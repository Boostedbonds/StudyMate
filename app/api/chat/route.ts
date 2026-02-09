import { NextResponse } from "next/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export async function POST(req: Request) {
  try {
    if (!GEMINI_API_KEY) {
      return NextResponse.json(
        { reply: "Gemini API key is missing." },
        { status: 500 }
      );
    }

    const body = await req.json();
    const messages = body.messages;

    const prompt = messages
      .map((m: any) =>
        m.role === "user"
          ? `Student: ${m.content}`
          : `Teacher: ${m.content}`
      )
      .join("\n");

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }],
            },
          ],
        }),
      }
    );

    const geminiData = await geminiRes.json();

    const reply =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!reply) {
      return NextResponse.json({
        reply: "I couldn't generate a response. Please try again.",
      });
    }

    return NextResponse.json({ reply });
  } catch (error) {
    return NextResponse.json(
      { reply: "Server error while contacting Gemini." },
      { status: 500 }
    );
  }
}
