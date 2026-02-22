import { NextRequest, NextResponse } from "next/server";

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
  questionPaper?: string;
  answers: string[];
  startedAt?: number;
};

/* ================= GLOBAL CONTEXT ================= */

const GLOBAL_CONTEXT = `
You are StudyMate, aligned strictly to:
- NCERT textbooks
- Official CBSE syllabus
- CBSE board exam pattern

Always adapt explanation strictly by student's class.
Never go outside CBSE scope.
`;

/* ================= MODE PROMPTS ================= */

const TEACHER_PROMPT = `
You are in TEACHER MODE.

ROLE:
You are a real CBSE classroom teacher.

RULES:
- Student name and class are already known. Do NOT ask again.
- Answer ONLY NCERT / CBSE syllabus related queries.
- If student asks non-academic question, politely refuse.
- Explain clearly according to student's class.
- Structured CBSE-style explanation.
- After proper explanation, ask exactly 2 short revision questions.
- If student is correcting you, acknowledge and fix immediately.
`;

const ORAL_PROMPT = `
You are in ORAL MODE.

- Student name and class already known.
- Keep answers short and conversational.
- Strictly NCERT / CBSE aligned.
- Do NOT ask for class again.
`;

const PROGRESS_PROMPT = `
You are generating a concise CBSE-style academic performance summary.
Maximum 6 lines.
Professional tone.
`;

const EXAMINER_PROMPT = `
You are in EXAMINER MODE.

Return STRICT JSON ONLY:

{
  "marksObtained": number,
  "totalMarks": number,
  "percentage": number,
  "detailedEvaluation": "Full explanation text"
}

No markdown.
No commentary.
Pure JSON only.
`;

/* ================= SESSION STORE ================= */

const examSessions = new Map<string, ExamSession>();

function getSessionKey(student?: StudentContext) {
  if (!student?.name) return "anonymous";
  return `${student.name}_${student.class ?? "unknown"}`;
}

/* ================= HELPERS ================= */

function looksLikeSubjectRequest(text: string) {
  const keywords = [
    "chapter",
    "history",
    "science",
    "math",
    "mathematics",
    "geography",
    "geo",
    "civics",
    "economics",
    "eco",
    "english",
    "hindi",
  ];
  return keywords.some((k) => text.includes(k));
}

function calculateDurationMinutes(request: string): number {
  const chapterMatches = request.match(/\b\d+\b/g);
  const chapterCount = chapterMatches ? chapterMatches.length : 1;

  if (chapterCount >= 4) return 150;
  if (chapterCount === 3) return 120;
  if (chapterCount === 2) return 90;
  return 60;
}

function safeParseEvaluationJSON(text: string) {
  try {
    const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return null;
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

/* ================= GEMINI CALL ================= */

async function callGemini(
  messages: ChatMessage[],
  temperature: number = 0.2
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return "AI configuration error.";

  try {
    const contents = messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content ?? "" }],
    }));

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents,
          generationConfig: { temperature },
        }),
      }
    );

    const data = await res.json();

    return (
      data?.candidates?.[0]?.content?.parts?.[0]?.text ??
      "Unable to generate response."
    );
  } catch {
    return "AI server error.";
  }
}

/* ================= API HANDLER ================= */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const mode: string = body?.mode ?? "";
    const student: StudentContext | undefined = body?.student;

    const history: ChatMessage[] =
      Array.isArray(body?.history)
        ? body.history
        : Array.isArray(body?.messages)
        ? body.messages
        : [];

    const message: string =
      body?.message ??
      history.filter((m) => m.role === "user").pop()?.content ??
      "";

    const lower = message.toLowerCase().trim();

    const fullConversation: ChatMessage[] = [
      ...history,
      { role: "user", content: message },
    ];

    /* ================= EXAMINER MODE ================= */

    if (mode === "examiner") {
      const key = getSessionKey(student);
      const existing = examSessions.get(key);
      const session: ExamSession =
        existing ?? { status: "IDLE", answers: [] };

      const greetingLine = `Hi ${student?.name ?? "Student"} of Class ${student?.class ?? "?"}. Please tell me the subject and chapters for your test.`;

      const isSubmit = [
        "submit",
        "done",
        "finished",
        "finish",
        "end test",
      ].includes(lower);

      /* ---- SUBMIT ---- */

      if (isSubmit && session.status === "IN_EXAM") {
        let questionPaper = session.questionPaper ?? "";
        let answers = session.answers ?? [];

        if (!questionPaper) {
          questionPaper = fullConversation
            .filter((m) => m.role === "assistant")
            .map((m) => m.content ?? "")
            .join("\n\n");

          answers = fullConversation
            .filter((m) => m.role === "user")
            .map((m) => m.content ?? "")
            .filter(
              (m) =>
                !["submit", "done", "finished", "finish", "end test"].includes(
                  m.toLowerCase().trim()
                )
            );
        }

        if (!questionPaper || answers.length === 0) {
          return NextResponse.json({
            reply:
              "Unable to locate question paper or answers. Please resend your answers.",
          });
        }

        const evaluationPrompt = `
Evaluate this answer sheet.

QUESTION PAPER:
${questionPaper}

STUDENT ANSWERS:
${answers.join("\n\n")}
`;

        const resultText = await callGemini(
          [
            { role: "system", content: GLOBAL_CONTEXT },
            { role: "system", content: EXAMINER_PROMPT },
            { role: "user", content: evaluationPrompt },
          ],
          0.2
        );

        examSessions.delete(key);

        return NextResponse.json({ reply: resultText });
      }

      /* ---- COLLECT ANSWERS SILENTLY ---- */

      if (session.status === "IN_EXAM") {
        session.answers.push(message);
        examSessions.set(key, session);
        return NextResponse.json({ reply: "" });
      }

      /* ---- SUBJECT DETECTED → WAIT FOR START ---- */

      if (looksLikeSubjectRequest(lower) && session.status === "IDLE") {
        examSessions.set(key, {
          status: "READY",
          subjectRequest: message,
          answers: [],
        });

        return NextResponse.json({
          reply:
            "Subject noted. Type START to begin your exam.",
        });
      }

      /* ---- START COMMAND ---- */

      if (lower === "start" && session.status === "READY") {
        const duration = calculateDurationMinutes(
          session.subjectRequest ?? ""
        );

        const paper = await callGemini(
          [
            { role: "system", content: GLOBAL_CONTEXT },
            {
              role: "user",
              content: `
Generate a NEW CBSE question paper.

Class: ${student?.class ?? ""}
Topic: ${session.subjectRequest}
Time Allowed: ${duration} minutes

Follow CBSE board pattern strictly.
Mention Total Marks.
`,
            },
          ],
          0.7
        );

        examSessions.set(key, {
          status: "IN_EXAM",
          subjectRequest: session.subjectRequest,
          questionPaper: paper,
          answers: [],
          startedAt: Date.now(),
        });

        return NextResponse.json({ reply: paper });
      }

      return NextResponse.json({ reply: greetingLine });
    }

    /* ================= TEACHER ================= */

    if (mode === "teacher") {
      const reply = await callGemini([
        { role: "system", content: GLOBAL_CONTEXT },
        { role: "system", content: TEACHER_PROMPT },
        ...fullConversation,
      ]);
      return NextResponse.json({ reply });
    }

    /* ================= ORAL ================= */

    if (mode === "oral") {
      const reply = await callGemini([
        { role: "system", content: GLOBAL_CONTEXT },
        { role: "system", content: ORAL_PROMPT },
        ...fullConversation,
      ]);
      return NextResponse.json({ reply });
    }

    /* ================= PROGRESS ================= */

    if (mode === "progress") {
      const reply = await callGemini([
        { role: "system", content: GLOBAL_CONTEXT },
        { role: "system", content: PROGRESS_PROMPT },
        ...fullConversation,
      ]);
      return NextResponse.json({ reply });
    }

    return NextResponse.json({ reply: "Invalid mode." });
  } catch {
    return NextResponse.json(
      { reply: "AI server error. Please try again." },
      { status: 500 }
    );
  }
}
