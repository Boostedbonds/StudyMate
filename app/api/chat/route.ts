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
You are Shauri — an AI tutor aligned strictly to NCERT and CBSE.

You must:
- Adapt answers to the student's class level
- Stay within the syllabus
- Be clear, human, warm, and helpful
- ALWAYS remember the student's name and class if provided — use them naturally
`;

/* ================= PROMPTS ================= */

function buildTeacherPrompt(name: string, cls: string) {
  return `
You are a real CBSE teacher named Shauri.

STUDENT INFO (CRITICAL — always remember this):
- Name: ${name}
- Class: ${cls}
- Board: CBSE / NCERT

STYLE:
- Human, calm, mentor-like
- Teach ONE concept at a time
- Max 5–6 lines per reply
- After explaining → ask 1–2 short questions to check understanding

RULES:
- You KNOW the student's name is "${name}" and their class is "${cls}" — state this confidently if asked
- You KNOW the student's syllabus is CBSE Class ${cls} — confirm this confidently if asked
- If student greets → reply warmly using their name, ask what they want to learn
- If a topic is mentioned in any previous message → START teaching that topic immediately, do NOT ask again
- If student asks "do you know my name" → say "Yes! You're ${name}, Class ${cls} student."
- If student asks "do you know my syllabus" → say "Yes! You follow the CBSE/NCERT Class ${cls} syllabus."
- NEVER say "I don't know your name" or "I don't have that info"
- NEVER start a fresh greeting if conversation is already ongoing
- NEVER dump the full chapter — teach step by step
- NO repetition of what was already said

FLOW:
Greet by name (first message only) → Ask topic → Explain → Ask → Wait → Continue
`;
}

const ORAL_PROMPT = `
You are in ORAL MODE — an interactive spoken quiz.

- Conversational, short replies only
- Ask one small question at a time
- Give immediate feedback on answers
- Keep it interactive and encouraging
- Strictly NCERT aligned
`;

const PROGRESS_PROMPT = `
Analyze this student's exam performance data.

- Max 5 lines
- Clearly state strengths
- Clearly state weaknesses
- Give one actionable improvement suggestion
- Be encouraging but honest
`;

const EXAMINER_PROMPT = `
Generate a CBSE-style question paper.

Format:
- Mention subject, class, time limit, and total marks at the top
- Divide into proper sections (Section A: MCQ, Section B: Short Answer, Section C: Long Answer)
- Include marks per question
- No explanations or answers — only the question paper
`;

/* ================= MEMORY ================= */

const examSessions = new Map<string, ExamSession>();

function getKey(student?: StudentContext) {
  return `${student?.name || "anon"}_${student?.class || "x"}`;
}

/* ================= HELPERS ================= */

function isGreeting(text: string) {
  return ["hi", "hello", "hey", "hii", "helo"].includes(text.trim().toLowerCase());
}

function isSubmit(text: string) {
  return ["submit", "done", "finish", "finished"].includes(text.trim().toLowerCase());
}

function isStart(text: string) {
  return text.trim().toLowerCase() === "start";
}

function looksLikeSubject(text: string) {
  return /math|science|history|geo|civics|english|hindi|chapter|physics|chemistry|biology|sst|social/i.test(text);
}

/* ================= AI CALL ================= */

async function callAI(messages: ChatMessage[]) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return "AI error: Missing API key.";

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: messages
            .filter((m) => m.role !== "system") // Gemini doesn't support system role in contents
            .map((m) => ({
              role: m.role === "assistant" ? "model" : "user",
              parts: [{ text: m.content || "" }],
            })),
          // Inject system messages via systemInstruction instead
          systemInstruction: {
            parts: [
              {
                text: messages
                  .filter((m) => m.role === "system")
                  .map((m) => m.content)
                  .join("\n\n"),
              },
            ],
          },
        }),
      }
    );

    const data = await res.json();

    return (
      data?.candidates?.[0]?.content?.parts?.[0]?.text || "Unable to respond."
    );
  } catch {
    return "AI server error. Please try again.";
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

    // Build conversation WITH the new user message appended
    const conversation: ChatMessage[] = [
      ...history,
      { role: "user", content: message },
    ];

    /* ================= TEACHER ================= */

    if (mode === "teacher") {
      const name = student?.name || "Student";
      const cls = student?.class || "your";

      // Only do a shortcut greeting on the VERY first message (no history)
      if (isGreeting(lower) && history.length === 0) {
        return NextResponse.json({
          reply: `Hi ${name}! 👋 Great to see you. You're in Class ${cls}, right? What topic would you like to learn today?`,
        });
      }

      // For everything else (including identity questions), let the AI handle it
      const reply = await callAI([
        { role: "system", content: GLOBAL_CONTEXT },
        { role: "system", content: buildTeacherPrompt(name, cls) },
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
          reply: `Hi ${student?.name || "Student"}! 👋 I'm your examiner for Class ${student?.class || ""}.\n\nPlease tell me the subject and chapters you want to be tested on.`,
        });
      }

      if (isSubmit(lower) && session.status === "IN_EXAM") {
        const evaluation = await callAI([
          { role: "system", content: GLOBAL_CONTEXT },
          {
            role: "system",
            content: `You are evaluating a Class ${student?.class || ""} CBSE student's exam answers. Give marks, feedback per question, and a final score out of total marks.`,
          },
          {
            role: "user",
            content: `Question Paper:\n${session.questionPaper}\n\nStudent Answers:\n${session.answers.join("\n")}`,
          },
        ]);

        await supabase.from("exam_attempts").insert({
          student_name: student?.name || "",
          class: student?.class || "",
          subject: session.subject || "General",
          percentage: 60, // TODO: parse actual score from evaluation
          created_at: new Date().toISOString(),
        });

        examSessions.delete(key);

        return NextResponse.json({ reply: evaluation });
      }

      if (session.status === "IN_EXAM") {
        session.answers.push(message);
        examSessions.set(key, session);
        return NextResponse.json({
          reply: "Answer recorded ✅ Continue with the next question, or type **submit** when done.",
        });
      }

      if (looksLikeSubject(lower) && session.status === "IDLE") {
        examSessions.set(key, {
          status: "READY",
          subjectRequest: message,
          subject: message,
          answers: [],
        });

        return NextResponse.json({
          reply: `Got it! I'll prepare a question paper for: **${message}**.\n\nType **start** when you're ready to begin.`,
        });
      }

      if (isStart(lower) && session.status === "READY") {
        const paper = await callAI([
          { role: "system", content: GLOBAL_CONTEXT },
          { role: "system", content: EXAMINER_PROMPT },
          {
            role: "user",
            content: `Class ${student?.class || ""}, ${session.subjectRequest}`,
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
        reply: "Please tell me the subject and chapters you want to be examined on.",
      });
    }

    /* ================= ORAL ================= */

    if (mode === "oral") {
      const name = student?.name || "Student";
      const cls = student?.class || "";

      const reply = await callAI([
        { role: "system", content: GLOBAL_CONTEXT },
        {
          role: "system",
          content: `${ORAL_PROMPT}\n\nStudent: ${name}, Class ${cls}`,
        },
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
          content: `Student: ${student?.name || "Unknown"}, Class: ${student?.class || "Unknown"}\n\nAttempts:\n${JSON.stringify(attempts, null, 2)}`,
        },
      ]);

      return NextResponse.json({ reply });
    }

    return NextResponse.json({ reply: "Invalid mode." });
  } catch {
    return NextResponse.json(
      { reply: "Server error. Please try again." },
      { status: 500 }
    );
  }
}