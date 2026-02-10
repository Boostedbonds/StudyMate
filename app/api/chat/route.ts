import { NextRequest, NextResponse } from "next/server";

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

type StudentContext = {
  name: string;
  class: string;
  board: string;
};

/* ================= GLOBAL CBSE / NCERT CONTEXT ================= */

const GLOBAL_CBSE_CONTEXT = `
You are StudyMate, a CBSE-based AI learning platform.

Primary authority:
- NCERT textbooks
- CBSE official syllabus and exam patterns

Always adapt explanations, difficulty, and language
based on the student's class.

Stay strictly within CBSE & NCERT scope.
`;

/* ================= MANDATORY CLASS DIFFERENTIATION ================= */

const CLASS_DIFFERENTIATION_RULE = `
MANDATORY CLASS DIFFERENTIATION RULE (STRICT):
Responses must differ clearly based on CBSE class level.
`;

/* ================= MODE PROMPTS ================= */

const TEACHER_MODE_SYSTEM_PROMPT = `
You are StudyMate in TEACHER MODE.
Teach according to CBSE syllabus.
Ask short revision questions.
Do NOT conduct exams.
`;

const EXAMINER_MODE_SYSTEM_PROMPT = `
You are StudyMate in EXAMINER MODE acting as a CBSE board examiner.

Generate paper ONLY on START.
Stay silent until SUBMIT.
`;

const ORAL_MODE_SYSTEM_PROMPT = `
You are StudyMate in ORAL MODE.
Teach conversationally.
`;

const PROGRESS_AI_SYSTEM_PROMPT = `
You are a CBSE school teacher writing a progress report
for parents and students.

Based on subject-wise performance data:
- Clearly state strengths
- Clearly state weak areas
- Mention which subject needs priority
- Use simple, respectful, parent-friendly language
- NO marks calculation
- NO teaching
- NO exam questions
`;

/* ================= EXAM SESSION STORE ================= */

type ExamSession = {
  status: "IDLE" | "IN_EXAM";
  questionPaper?: string;
  answers: string[];
};

const examSessions = new Map<string, ExamSession>();

function getSessionKey(student?: StudentContext) {
  if (!student) return "anonymous";
  return `${student.name}_${student.class}_${student.board ?? "CBSE"}`;
}

/* ================= GEMINI CALL ================= */

async function callGemini(messages: ChatMessage[]) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY");

  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        generationConfig: { temperature: 0.3 },
      }),
    }
  );

  const data = await res.json();
  return (
    data.candidates?.[0]?.content?.parts?.[0]?.text ??
    "No response generated."
  );
}

/* ================= API HANDLER ================= */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, mode, student } = body as {
      messages: ChatMessage[];
      mode: string;
      student?: StudentContext;
    };

    /* ================= PROGRESS AI ANALYSIS ================= */

    if (mode === "progress") {
      const systemMessages: ChatMessage[] = [
        { role: "system", content: GLOBAL_CBSE_CONTEXT },
        { role: "system", content: CLASS_DIFFERENTIATION_RULE },
        { role: "system", content: PROGRESS_AI_SYSTEM_PROMPT },
      ];

      if (student?.name && student?.class) {
        systemMessages.unshift({
          role: "system",
          content: `Student Profile:
Name: ${student.name}
Class: ${student.class}
Board: ${student.board ?? "CBSE"}`,
        });
      }

      const finalMessages = [...systemMessages, ...messages];
      const reply = await callGemini(finalMessages);
      return NextResponse.json({ reply });
    }

    /* ================= EXAMINER MODE (UNCHANGED) ================= */

    if (mode === "examiner") {
      const key = getSessionKey(student);
      const session =
        examSessions.get(key) ?? { status: "IDLE", answers: [] };

      const lastUserMessage =
        messages.filter((m) => m.role === "user").pop()?.content
          ?.toLowerCase()
          ?.trim() ?? "";

      if (session.status === "IDLE") {
        if (!["start", "begin", "yes"].includes(lastUserMessage)) {
          return NextResponse.json({ reply: "Type START to begin the exam." });
        }

        const paper = await callGemini([
          { role: "system", content: GLOBAL_CBSE_CONTEXT },
          { role: "system", content: CLASS_DIFFERENTIATION_RULE },
          { role: "system", content: EXAMINER_MODE_SYSTEM_PROMPT },
        ]);

        examSessions.set(key, {
          status: "IN_EXAM",
          questionPaper: paper,
          answers: [],
        });

        return NextResponse.json({ reply: paper });
      }

      if (session.status === "IN_EXAM") {
        if (["submit", "done", "finish", "end test"].includes(lastUserMessage)) {
          const result = await callGemini([
            { role: "system", content: GLOBAL_CBSE_CONTEXT },
            {
              role: "user",
              content: `
QUESTION PAPER:
${session.questionPaper}

STUDENT ANSWERS:
${session.answers.join("\n\n")}
`,
            },
          ]);

          examSessions.delete(key);
          return NextResponse.json({ reply: result });
        }

        session.answers.push(lastUserMessage);
        examSessions.set(key, session);
        return NextResponse.json({ reply: "" });
      }
    }

    /* ================= OTHER MODES ================= */

    const systemMessages: ChatMessage[] = [
      { role: "system", content: GLOBAL_CBSE_CONTEXT },
      { role: "system", content: CLASS_DIFFERENTIATION_RULE },
    ];

    if (mode === "teacher") {
      systemMessages.push({
        role: "system",
        content: TEACHER_MODE_SYSTEM_PROMPT,
      });
    }

    if (mode === "oral") {
      systemMessages.push({
        role: "system",
        content: ORAL_MODE_SYSTEM_PROMPT,
      });
    }

    const finalMessages = [...systemMessages, ...messages];
    const reply = await callGemini(finalMessages);
    return NextResponse.json({ reply });
  } catch {
    return NextResponse.json(
      { reply: "AI server error. Please try again." },
      { status: 500 }
    );
  }
}
