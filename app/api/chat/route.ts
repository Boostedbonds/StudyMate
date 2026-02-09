import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body || !Array.isArray(body.messages)) {
      return NextResponse.json(
        { reply: "Invalid request format." },
        { status: 200 }
      );
    }

    const lastUserMessage = body.messages
      .slice()
      .reverse()
      .find((m: any) => m.role === "user")?.content;

    if (!lastUserMessage) {
      return NextResponse.json(
        { reply: "Please ask something to continue." },
        { status: 200 }
      );
    }

    // ✅ Gemini 2.0 Flash (v1beta)
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
    });

    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [{ text: lastUserMessage }],
        },
      ],
    });

    const reply =
      result?.response?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "I couldn’t generate a response. Please try again.";

    return NextResponse.json({ reply }, { status: 200 });
  } catch (err) {
    console.error("Gemini API error:", err);

    return NextResponse.json(
      { reply: "Something went wrong. Please try again." },
      { status: 200 }
    );
  }
}
