import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../lib/supabase";

/* ================= TYPES ================= */

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

type StudentContext = {
  name?: string;
  class?: string;
  board?: string;
};

type ExamSession = {
  status: "IDLE" | "READY" | "IN_EXAM";
  subjectRequest?: string;
  subject?: string;
  questionPaper?: string;
  answers: string[];
  startedAt?: number;
};

/* ================= GLOBAL ================= */

const GLOBAL_CONTEXT = `
You are Shauri — aligned strictly to NCERT and CBSE.
Adapt by class. Be clear, human, and structured.
`;

/* ================= PROMPTS ================= */

const TEACHER_PROMPT = `
You are a real CBSE teacher.

STRICT BEHAVIOR:

1. GREETING:
- If student says hi → reply once:
  "Hi {name} 👋 Class {class} — what would you like to learn?"
- Never repeat greeting again

2. TOPIC DETECTION:
- If student mentions subject/chapter → START TEACHING immediately
- Never ask again "what do you want to learn"

3. TEACHING:
- Only ONE concept
- Max 5 lines
- Simple CBSE explanation
- Then ask 1–2 short questions

4. ADAPTIVE:
- If correct → next concept
- If wrong → re-explain simply

5. DO NOT:
- Repeat yourself
- Dump chapter
- Act robotic
`;

const EXAMINER_PROMPT = `
Generate a CBSE question paper.
Include sections, marks, time.
No explanations.
`;

/* ================= SESSION ================= */

const examSessions = new Map<string, ExamSession>();

function getKey(student?: StudentContext) {
  return `${student?.name || "anon"}_${student?.class || "x"}`;
}

/* ================= HELPERS ================= */

function isGreeting(text: string) {
  return ["hi", "hello", "hey"].includes(text);
}

function isSubmit(text: string) {
  return ["submit", "done", "finish", "finished"].includes(text);
}

function isStart(text: string) {
  return text === "start";
}

function looksLikeSubject(text: string) {
  return /math|science|history|geo|civics|english|hindi|chapter/i.test(text);
}

/* ================= GEMINI ================= */

async function callAI(messages: ChatMessage[]) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return "AI error";

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: messages.map((m) => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: m.content || "" }],
          })),
        }),
      }
    );

    const data = await res.json();

    return (
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Unable to respond."
    );
  } catch {
    return "AI server error.";
  }
}

/* ================= API ================= */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const mode: string = body?.mode || "";
    const student: StudentContext = body?.student || {};

    const history: ChatMessage[] = Array.isArray(body?.history)
      ? body.history
      : [];

    const message: string =
      body?.message ||
      history.filter((m) => m.role === "user").pop()?.content ||
      "";

    const lower = message.toLowerCase().trim();
    const key = getKey(student);

    const name = student?.name || "Student";
    const cls = student?.class || "";

    const conversation: ChatMessage[] = [
      ...history,
      { role: "user", content: message },
    ];

    /* ================= TEACHER ================= */

    if (mode === "teacher") {
      // ✅ greeting handled BEFORE AI
      if (isGreeting(lower)) {
        return NextResponse.json({
          reply: `Hi ${name} 👋 Class ${cls} — what would you like to learn today?`,
        });
      }

      // ✅ if topic detected → go to AI (NO BLOCKING)
      if (!looksLikeSubject(lower) && history.length > 0) {
        return NextResponse.json({
          reply: `Let’s stay focused 👍 Tell me the subject or chapter.`,
        });
      }

      const reply = await callAI([
        { role: "system", content: GLOBAL_CONTEXT },
        {
          role: "system",
          content: TEACHER_PROMPT.replace("{name}", name).replace(
            "{class}",
            cls
          ),
        },
        ...conversation,
      ]);

      // ✅ optional learning log (safe)
      await supabase.from("student_memory").insert({
        student_name: name,
        class: cls,
        mode: "teacher",
        message,
        created_at: new Date().toISOString(),
      });

      return NextResponse.json({ reply });
    }

    /* ================= EXAMINER ================= */

    if (mode === "examiner") {
      const session =
        examSessions.get(key) || { status: "IDLE", answers: [] };

      if (isGreeting(lower) && session.status === "IDLE") {
        return NextResponse.json({
          reply: `Hi ${name}, Class ${cls}. I'm your examiner.\nTell subject & chapters.`,
        });
      }

      if (isSubmit(lower) && session.status === "IN_EXAM") {
        const evaluation = await callAI([
          { role: "system", content: GLOBAL_CONTEXT },
          {
            role: "user",
            content: `Evaluate answers:\n${session.answers.join("\n")}`,
          },
        ]);

        await supabase.from("exam_attempts").insert({
          student_name: name,
          class: cls,
          subject: session.subject || "General",
          percentage: 60,
          created_at: new Date().toISOString(),
        });

        examSessions.delete(key);

        return NextResponse.json({ reply: evaluation });
      }

      if (session.status === "IN_EXAM") {
        session.answers.push(message);
        examSessions.set(key, session);
        return NextResponse.json({ reply: "" });
      }

      if (looksLikeSubject(lower) && session.status === "IDLE") {
        examSessions.set(key, {
          status: "READY",
          subjectRequest: message,
          subject: message,
          answers: [],
        });

        return NextResponse.json({
          reply: "Subject noted. Type START to begin.",
        });
      }

      if (isStart(lower) && session.status === "READY") {
        const paper = await callAI([
          { role: "system", content: GLOBAL_CONTEXT },
          { role: "system", content: EXAMINER_PROMPT },
          {
            role: "user",
            content: `Class ${cls}, ${session.subjectRequest}`,
          },
        ]);

        examSessions.set(key, {
          status: "IN_EXAM",
          subjectRequest: session.subjectRequest,
          subject: session.subject,
          questionPaper: paper,
          answers: [],
          startedAt: Date.now(),
        });

        return NextResponse.json({ reply: paper });
      }

      return NextResponse.json({
        reply: "Please provide subject and chapters.",
      });
    }

    return NextResponse.json({ reply: "Invalid mode." });
  } catch {
    return NextResponse.json(
      { reply: "Server error. Try again." },
      { status: 500 }
    );
  }
}