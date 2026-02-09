import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();
  const userMessage: string = body?.message ?? "";

  const reply = generateShortAnswer(userMessage);

  return NextResponse.json({
    reply,
  });
}

function generateShortAnswer(question: string): string {
  if (!question) return "Please ask a question.";

  return [
    "Here’s a short answer:",
    "• Focus on the main idea",
    "• Learn step by step",
    "• Practice with examples",
    "",
    "Want me to explain further?",
  ].join("\n");
}
