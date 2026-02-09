import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();
  const message: string = (body?.message || "").toLowerCase().trim();

  let reply = "";

  if (!message) {
    reply = "Please ask a question.";
  } else if (message === "hi" || message === "hello") {
    reply = "Hi! 😊 What would you like to study today?";
  } else if (message.includes("day")) {
    const today = new Date();
    reply = `Today is ${today.toLocaleDateString("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    })}.`;
  } else if (message.includes("what is")) {
    reply = [
      "Here’s a simple explanation:",
      "• Focus on the definition",
      "• Understand with an example",
      "• Revise once",
    ].join("\n");
  } else {
    reply = [
      "Here’s a short answer:",
      "• Read the question carefully",
      "• Break it into parts",
      "• Answer step by step",
      "",
      "Want a detailed explanation?",
    ].join("\n");
  }

  return NextResponse.json({ reply });
}
