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
You are Shauri — strictly aligned to NCERT and CBSE.

- Adapt to student's class
- Stay within syllabus
- Be clear, human, and concise
`;

/* ================= PROMPTS ================= */

const TEACHER_PROMPT = `
You are a real CBSE school teacher.

STRICT RULES:
- MAX 3–4 lines only
- Teach ONLY what is asked
- NO introductions
- NO "let's start" or filler lines
- NO asking what to learn

STYLE:
- Human, calm, clear
- Start explanation immediately
- End with one small question (optional)
`;

const ORAL_PROMPT = `
You are in ORAL MODE.

- Conversational
- Short replies
- Ask small questions
- Keep it interactive
`;

const PROGRESS_PROMPT = `
Analyze student performance.

- Max 5 lines
- Strengths
- Weaknesses
- One improvement
`;

const EXAMINER_PROMPT = `
You are a strict CBSE examiner.

- Professional human tone
- Generate full question paper only
- No explanation
- No extra words

FORMAT:
Class, Subject
Time & Marks

Section A
Section B
Section C
`;

/* ================= MEMORY ================= */

const examSessions = new Map<string, ExamSession>();

function getKey(student?: StudentContext) {
  return `${student?.name || "anon"}_${student?.class || "x"}`;
}

/* ================= HELPERS ================= */

function isGreeting(text: string) {
  return /^(hi|hello|hey)\b/i.test(text);
}

function isSubmit(text: string) {
  return /^(submit|done|finish|finished)\b/i.test(text);
}

function isStart(text: string) {
  return text === "start";
}

function looksLikeSubject(text: string) {
  return /math|science|history|geo|civics|english|hindi|chapter/i.test(text);
}

function isDirectStudyRequest(text: string) {
  return /chapter|exercise|numerical|question|define|what is|explain/i.test(text);
}

/* ================= AI CALL ================= */

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

    // 🔥 LIMIT CONTEXT (prevents repetition)
    const conversation: ChatMessage[] = [
      ...history.slice(-4),
      { role: "user", content: message },
    ];

    /* ================= TEACHER ================= */

    if (mode === "teacher") {
      const name = student?.name || "Student";
      const cls = student?.class || "";

      // Greeting
      if (isGreeting(lower)) {
        return NextResponse.json({
          reply: `Hi ${name} 👋`,
        });
      }

      // 🔥 FORCE TEACHING MODE (MAIN FIX)
      if (looksLikeSubject(lower) || isDirectStudyRequest(lower)) {
        const reply = await callAI([
          { role: "system", content: GLOBAL_CONTEXT },
          { role: "system", content: TEACHER_PROMPT },
          {
            role: "system",
            content: `Student name is ${name}. Class is ${cls}. Start teaching immediately.`,
          },
          {
            role: "user",
            content: `Explain clearly: ${message}`,
          },
        ]);

        return NextResponse.json({ reply });
      }

      // Normal fallback
      const reply = await callAI([
        { role: "system", content: GLOBAL_CONTEXT },
        { role: "system", content: TEACHER_PROMPT },
        {
          role: "system",
          content: `Student name is ${name}. Class is ${cls}.`,
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
          reply: `Hello ${student?.name || "Student"}.\nProvide subject and chapters.`,
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
          reply: "Subject noted. Type START.",
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
        reply: "Provide subject and chapters.",
      });
    }

    /* ================= ORAL ================= */

    if (mode === "oral") {
      const reply = await callAI([
        { role: "system", content: GLOBAL_CONTEXT },
        { role: "system", content: ORAL_PROMPT },
        ...conversation,
      ]);

      return NextResponse.json({ reply });
    }

    /* ================= PROGRESS ================= */

    if (mode === "progress") {
      const attempts = body?.attempts || [];

      const reply = await callAI([
        { role: "system", content: GLOBAL_CONTEXT },
        { role: "system", content: PROGRESS_PROMPT },
        {
          role: "user",
          content: JSON.stringify(attempts),
        },
      ]);

      return NextResponse.json({ reply });
    }

    return NextResponse.json({ reply: "Invalid mode." });
  } catch {
    return NextResponse.json(
      { reply: "Server error. Try again." },
      { status: 500 }
    );
  }
}