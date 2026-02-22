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

/* 🔥 NEW: Learning State */
type LearningState = {
  stage: "IDLE" | "EXPLAIN" | "QUESTION" | "EVALUATE";
  topic?: string;
  lastQuestion?: string;
};

/* ================= GLOBAL ================= */

const GLOBAL_CONTEXT = `
You are Shauri — aligned strictly to NCERT and CBSE.

You must:
- Adapt answers to student's class
- Stay within syllabus
- Be clear, human, and helpful
`;

/* ================= TEACHER PROMPT ================= */

const TEACHER_PROMPT = `
You are a CBSE teacher.

STRICT RULES:
- Teach ONLY ONE concept at a time
- Keep explanation short (max 5 lines)
- Use simple language
- After explanation → ask 1 short question
- DO NOT continue until student answers
- If student is wrong → re-explain simply
- If correct → move to next concept

DO NOT:
- Dump full chapter
- Give long answers
`;

/* ================= EXAMINER PROMPT ================= */

const EXAMINER_PROMPT = `
Generate CBSE question paper.

- Follow board pattern strictly
- Include sections, marks, time
- No explanation
`;

/* ================= SESSION ================= */

const examSessions = new Map<string, ExamSession>();

/* 🔥 NEW: Learning Memory */
const learningStates = new Map<string, LearningState>();

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

    const conversation: ChatMessage[] = [
      ...history,
      { role: "user", content: message },
    ];

    /* ================= TEACHER ================= */

    if (mode === "teacher") {
  const name = student?.name || "Student";
  const cls = student?.class || "";

  const reply = await callAI([
    {
      role: "system",
      content: GLOBAL_CONTEXT,
    },
    {
      role: "system",
      content: `
You are Shauri, a real CBSE teacher and mentor.

STUDENT:
Name: ${name}
Class: ${cls}

BEHAVIOR RULES:

1. GREETING:
- If student says "hi", "hello", etc → respond naturally like:
  "Hi ${name} 👋 Class ${cls} — what would you like to learn today?"
- Keep it short and human

2. CASUAL TALK:
- If student talks casually → respond briefly
- Then gently bring focus back to studies

3. TEACHING STYLE:
- Teach ONLY ONE concept at a time
- Max 5–6 lines
- Use simple CBSE language
- Use examples when needed
- DO NOT dump full chapter

4. INTERACTION:
- After teaching → ask 1–2 short questions
- If student answers:
   → correct → move forward
   → wrong → re-explain simply

5. CONTROL:
- Stay focused on studies
- Do NOT behave like chatbot
- Do NOT repeat generic lines
- Be like a real teacher

GOAL:
Make student understand step-by-step, not overwhelm.
`,
    },
    ...conversation,
  ]);

  return NextResponse.json({ reply });
}

    /* ================= EXAMINER ================= */

    if (mode === "examiner") {
      const session =
        examSessions.get(key) || { status: "IDLE", answers: [] };

      if (isGreeting(lower) && session.status === "IDLE") {
        return NextResponse.json({
          reply: `Hi ${student?.name || "Student"}, Class ${
            student?.class || ""
          }.\nI'm your examiner.\n\nTell subject and chapters.`,
        });
      }

      if (isSubmit(lower) && session.status === "IN_EXAM") {
        const evaluation = await callAI([
          { role: "system", content: GLOBAL_CONTEXT },
          {
            role: "user",
            content: `
Evaluate answers:

${session.answers.join("\n")}
`,
          },
        ]);

        await supabase.from("exam_attempts").insert({
          student_name: student?.name || "",
          class: student?.class || "",
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
            content: `Class ${student?.class}, ${session.subjectRequest}`,
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