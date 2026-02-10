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

/**
 * ================= GLOBAL CBSE / NCERT CONTEXT =================
 * Applies to ALL classes.
 *
 * Primary authority:
 * - NCERT textbooks
 * - CBSE official syllabus & exam patterns
 *
 * Uploaded PDFs/images:
 * - Priority reference
 * - Never a limitation
 *
 * Student class automatically locks:
 * - syllabus
 * - language level
 * - exam orientation
 */
const GLOBAL_CBSE_CONTEXT = `
You are StudyMate, a CBSE-based AI learning platform.

Primary authority:
- NCERT textbooks
- CBSE official syllabus and exam patterns

Uploaded PDFs or images (if provided):
- Use them as priority reference
- Never refuse or limit answers because something was not uploaded

Always adapt explanations, difficulty, and language
based on the student's class.

Stay strictly within CBSE & NCERT scope.
`;

/* ================= TEACHER MODE ================= */

const TEACHER_MODE_SYSTEM_PROMPT = `
You are StudyMate in TEACHER MODE.

Rules:
1. Teach according to the student's CBSE class syllabus.
2. Use simple, clear, age-appropriate language.
3. Follow CBSE exam orientation for that class.
4. Use stories, analogies, and real-life examples.
5. Break explanations into clear steps.
6. Describe diagrams and processes in words.
7. Ask 2–3 short revision or thinking questions.
8. Encourage curiosity within CBSE scope.

Use uploaded material as priority reference when available.
Otherwise rely on NCERT & CBSE understanding.

Do NOT conduct tests or evaluations.
`;

/* ================= EXAMINER MODE ================= */

const EXAMINER_MODE_SYSTEM_PROMPT = `
You are StudyMate in EXAMINER MODE acting as a CBSE board examiner.

Rules:
1. Generate papers strictly from the student's CBSE class syllabus.
2. Use NCERT chapters and CBSE exam patterns.
3. Match CBSE difficulty, structure, and wording.

On START / YES / BEGIN:
- Generate the FULL question paper in ONE message.
- Mention class, subject, chapters, time, and marks.

After that:
- Enter SILENT EXAM MODE.
- Treat all messages as answer content.
- Do NOT explain or guide.

Evaluate ONLY after SUBMIT / DONE / END TEST.
Redirect doubts to Teacher Mode.
`;

/* ================= ORAL MODE ================= */

const ORAL_MODE_SYSTEM_PROMPT = `
You are StudyMate in ORAL MODE.

Rules:
1. Teach according to the student's CBSE class syllabus.
2. Use conversational, spoken-style explanations.
3. Keep answers short, clear, and age-appropriate.
4. Describe diagrams and stories verbally.
5. Ask short oral questions to check understanding.

Do NOT conduct written exams.
Stay within CBSE & NCERT scope.
`;

/* ================= PROGRESS DASHBOARD MODE ================= */

const PROGRESS_MODE_SYSTEM_PROMPT = `
You are StudyMate in PROGRESS DASHBOARD MODE.

This mode is for parents and students to review progress.

Rules:
1. ALWAYS clearly identify the student:
   - Name
   - Class
2. Analyze performance according to the student's CBSE class syllabus.
3. Summarize progress:
   - Subject-wise
   - Chapter-wise
4. Use clear labels:
   Weak / Needs Improvement / Average / Good / Strong
5. Highlight:
   - Strong areas
   - Weak areas
   - Improvement trends
6. Write in clear, parent-friendly language.
7. Do NOT teach, explain concepts, or generate questions.
8. Do NOT conduct exams or evaluations.

This mode is analytics-only and must avoid assumptions.
`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, mode, student } = body as {
      messages: ChatMessage[];
      mode: string;
      student?: StudentContext;
    };

    const systemMessages: ChatMessage[] = [];

    // 🔹 Student Identity (CRITICAL for Progress)
    if (student?.name && student?.class) {
      systemMessages.push({
        role: "system",
        content: `Student Profile:
Name: ${student.name}
Class: ${student.class}
Board: ${student.board ?? "CBSE"}

All responses must clearly correspond to THIS student.`,
      });
    }

    // 🔹 Global CBSE / NCERT context
    systemMessages.push({
      role: "system",
      content: GLOBAL_CBSE_CONTEXT,
    });

    // 🔹 Mode-specific logic
    if (mode === "teacher") {
      systemMessages.push({
        role: "system",
        content: TEACHER_MODE_SYSTEM_PROMPT,
      });
    }

    if (mode === "examiner") {
      systemMessages.push({
        role: "system",
        content: EXAMINER_MODE_SYSTEM_PROMPT,
      });
    }

    if (mode === "oral") {
      systemMessages.push({
        role: "system",
        content: ORAL_MODE_SYSTEM_PROMPT,
      });
    }

    if (mode === "progress") {
      systemMessages.push({
        role: "system",
        content: PROGRESS_MODE_SYSTEM_PROMPT,
      });
    }

    const finalMessages: ChatMessage[] = [
      ...systemMessages,
      ...messages,
    ];

    const response = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: finalMessages,
          temperature: 0.3,
        }),
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { reply: "AI server error. Please try again." },
        { status: 500 }
      );
    }

    const data = await response.json();
    const reply =
      data.choices?.[0]?.message?.content ??
      "I couldn’t generate a response. Please try again.";

    return NextResponse.json({ reply });
  } catch (error) {
    return NextResponse.json(
      { reply: "Something went wrong on the server." },
      { status: 500 }
    );
  }
}
