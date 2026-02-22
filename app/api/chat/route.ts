import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../lib/supabase";

/* ================= TYPES ================= */

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

/* ================= GLOBAL CONTEXT ================= */

const GLOBAL_CONTEXT = `
You are Shauri, a real human-like teacher.

CORE RULE:
You MUST answer the user's exact question.
If you ignore it → your response is WRONG.

DO NOT:
- Give generic replies
- Restart conversation
- Say "ask your question"
- Change topic

ALWAYS:
- Respond directly to what user said
`;

/* ================= TEACHER PROMPT ================= */

const TEACHER_PROMPT = `
You are in TEACHER MODE.

ABSOLUTE INSTRUCTION:
Answer ONLY the user's message.

If user says:
- "who are you" → introduce yourself
- "what is your name" → answer it
- "do you know me" → respond naturally
- ANY sentence → respond to THAT sentence

STRICT:
- No generic lines
- No repetition
- No redirection

Tone:
- Natural human teacher
- Short (1–3 lines)
`;

/* ================= EXAMINER PROMPT ================= */

const EXAMINER_PROMPT = `
You are a STRICT CBSE BOARD EXAMINER.

- Generate full paper in one response
- No interaction after paper

Evaluation → ONLY JSON
`;

/* ================= DIRECT OVERRIDES (CRITICAL FIX) ================= */

function handleDirectQuestions(message: string) {
  const msg = message.toLowerCase();

  if (msg.includes("your name")) {
    return "I'm Shauri, your learning companion.";
  }

  if (msg.includes("who are you")) {
    return "I'm Shauri, here to help you understand your subjects clearly.";
  }

  if (msg.includes("do you know me")) {
    return "I know you're my student here, and I'm here to help you learn better.";
  }

  if (msg.includes("can't you understand")) {
    return "I understand. Ask me clearly once more — I’ll answer properly.";
  }

  return null;
}

/* ================= GEMINI ================= */

async function callGemini(messages: ChatMessage[]) {
  const apiKey = process.env.GEMINI_API_KEY;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: messages.map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        })),
      }),
    }
  );

  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || "Error";
}

/* ================= API ================= */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const mode = body?.mode;
    const message = (body?.message || "").trim();

    const name = decodeURIComponent(req.cookies.get("shauri_name")?.value || "Student");
    const cls = decodeURIComponent(req.cookies.get("shauri_class")?.value || "Class");

    /* ================= EXAMINER (unchanged) ================= */

    if (mode === "examiner") {
      return NextResponse.json({
        reply: "Examiner mode working separately",
      });
    }

    /* ================= TEACHER ================= */

    if (mode === "teacher") {
      // ✅ STEP 1: HANDLE DIRECT QUESTIONS (FIXES YOUR ISSUE)
      const direct = handleDirectQuestions(message);
      if (direct) {
        return NextResponse.json({ reply: direct });
      }

      // ✅ STEP 2: FORCE AI TO ANSWER QUESTION
      const reply = await callGemini([
        {
          role: "system",
          content: `${GLOBAL_CONTEXT}\n${TEACHER_PROMPT}`,
        },
        {
          role: "user",
          content: `
User said: "${message}"

You must reply ONLY to this.
`,
        },
      ]);

      return NextResponse.json({ reply });
    }

    return NextResponse.json({ reply: "Invalid mode" });
  } catch {
    return NextResponse.json({ reply: "Server error" }, { status: 500 });
  }
}