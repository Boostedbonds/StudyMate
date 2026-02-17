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

/* ================= GLOBAL CONTEXT ================= */

const GLOBAL_CONTEXT = `
You are Shauri, strictly aligned to:
- NCERT textbooks
- Official CBSE syllabus
- CBSE board exam pattern
Never go outside CBSE scope.
Never guess the class.
`;

/* ================= MODE PROMPTS ================= */

const TEACHER_PROMPT = `
You are in TEACHER MODE.
- Student name & class already provided.
- NEVER ask class again.
- Strictly NCERT/CBSE aligned.
- If not academic → politely refuse.
- Ask exactly 2 revision questions.
`;

const ORAL_PROMPT = `
You are in ORAL MODE.
- Student name & class already known.
- Short classroom interaction.
- Strictly CBSE aligned.
`;

const PROGRESS_PROMPT = `
Generate a concise CBSE performance summary.

Rules:
- Maximum 6–8 lines.
- Mention overall performance level (Weak / Average / Good / Excellent).
- Mention strengths.
- Mention weaknesses.
- Suggest one improvement.
- Professional tone.
`;

/* ================= STRICT EXAMINER PROMPT (UPGRADED) ================= */

const EXAMINER_PROMPT = `
You are in EXAMINER MODE.

You are a STRICT CBSE BOARD EXAMINER.

Evaluate exactly like a real CBSE board paper checker.

STRICT CBSE EVALUATION RULES:

1. Marks must be awarded ONLY if the answer matches NCERT concepts correctly.

2. Give FULL marks ONLY if:
- All required points are present
- Concept is correct
- No incorrect statements exist

3. Give PARTIAL marks ONLY if:
- Some correct NCERT points are present
- AND clearly identifiable marking points exist

4. Give ZERO marks if:
- Answer is vague
- Answer is incomplete
- Key NCERT concepts are missing
- Concept is incorrect
- Answer is generic or guessed
- Answer is irrelevant

5. DO NOT assume student intent.
6. DO NOT infer missing points.
7. DO NOT reward effort. Reward correctness only.
8. Be strict like a real CBSE examiner.

DETAILED EVALUATION FORMAT inside detailedEvaluation:

Question 1: ✔ Correct (2/2)

Question 2: ✘ Wrong (0/3)
Reason: Missing required NCERT concept: ______
Correct Answer: ______

Question 3: ✘ Partial (1/3)
Reason: Incomplete answer. Missing key points: ______
Correct Answer: ______

FINAL SUMMARY:
Marks Obtained: X/Y
Percentage: Z%

Return STRICT JSON ONLY:

{
  "marksObtained": number,
  "totalMarks": number,
  "percentage": number,
  "detailedEvaluation": "Strict CBSE evaluation with reasons and correct answers"
}

No markdown.
No explanation outside JSON.
JSON only.
`;

/* ================= HELPERS ================= */

function looksLikeSubjectRequest(text: string) {
  const keywords = [
    "chapter","history","science","math","mathematics",
    "geography","geo","civics","economics","eco",
    "english","hindi"
  ];
  return keywords.some((k) => text.includes(k));
}

function calculateDurationMinutes(request: string): number {
  const nums = request.match(/\b\d+\b/g);
  const count = nums ? nums.length : 1;

  if (count >= 4) return 150;
  if (count === 3) return 120;
  if (count === 2) return 90;
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

async function callGemini(messages: ChatMessage[], temperature = 0.2) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return "AI configuration error.";

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
}

/* ================= API HANDLER ================= */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const mode: string = body?.mode ?? "";

    /* ================= COOKIE FALLBACK ================= */

    let student: StudentContext | undefined = body?.student;

    if (!student?.name || !student?.class) {
      const nameFromCookie = req.cookies.get("shauri_name")?.value;
      const classFromCookie = req.cookies.get("shauri_class")?.value;

      if (nameFromCookie && classFromCookie) {
        student = {
          name: decodeURIComponent(nameFromCookie),
          class: decodeURIComponent(classFromCookie),
          board: "CBSE",
        };
      }
    }

    /* ================= CHAT HISTORY ================= */

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

    const studentContext = `
Student Name: ${student?.name ?? "Student"}
Class: ${student?.class ?? "Not specified"}
Board: CBSE
`;

    const fullConversation: ChatMessage[] = [
      ...history,
      { role: "user", content: message },
    ];

    /* ================= AUTO REGISTER STUDENT ================= */

    let studentId: string | null = null;

    if (student?.name && student?.class) {

      const { data: existingRows, error: selectError } = await supabase
        .from("students")
        .select("id")
        .eq("name", student.name)
        .eq("class", student.class);

      if (selectError) {
        console.error("Student select error:", selectError);
      }

      if (existingRows && existingRows.length > 0) {
        studentId = existingRows[0].id;
      } else {
        const { data: insertedRows, error: insertError } = await supabase
          .from("students")
          .insert({
            name: student.name,
            class: student.class,
            board: "CBSE",
          })
          .select("id");

        if (insertError) {
          console.error("Student insert error:", insertError);
        }

        if (insertedRows && insertedRows.length > 0) {
          studentId = insertedRows[0].id;
        }
      }
    }

    /* ================= EXAMINER MODE ================= */

    if (mode === "examiner") {

      if (!studentId) {
        return NextResponse.json({ reply: "Student information missing." });
      }

      const { data: existingSession } = await supabase
        .from("exam_sessions")
        .select("*")
        .eq("student_id", studentId)
        .maybeSingle();

      const isSubmit = [
        "submit","done","finished","finish","end test"
      ].includes(lower);

      if (isSubmit && existingSession?.status === "IN_EXAM") {

        const questionPaper = existingSession.question_paper ?? "";
        const answers = existingSession.answers ?? [];

        const evaluationPrompt = `
Evaluate this answer sheet STRICTLY.

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

        const parsed = safeParseEvaluationJSON(resultText);

        const marksObtained = parsed?.marksObtained ?? 0;
        const totalMarks = parsed?.totalMarks ?? 0;
        const percentage =
          totalMarks > 0
            ? Math.round((marksObtained / totalMarks) * 100)
            : 0;

        const subjectText = existingSession.subject_request ?? "Exam";
        const chapters = subjectText.match(/\b\d+\b/g) ?? [];

        await supabase.from("exam_attempts").insert([
          {
            student_id: studentId,
            subject: subjectText,
            chapters,
            raw_answer: answers.join("\n\n"),
            score_percent: percentage,
            feedback: parsed?.detailedEvaluation ?? resultText,
            time_taken_seconds:
              existingSession.started_at
                ? Math.floor((Date.now() - existingSession.started_at) / 1000)
                : null,
          },
        ]);

        await supabase
          .from("exam_sessions")
          .delete()
          .eq("student_id", studentId);

        return NextResponse.json({
          reply: parsed?.detailedEvaluation ?? resultText,
          examEnded: true,
          marksObtained,
          totalMarks,
          percentage,
          subject: subjectText,
          chapters,
        });
      }

      if (existingSession?.status === "IN_EXAM") {

        const updatedAnswers = [
          ...(existingSession.answers ?? []),
          message,
        ];

        await supabase
          .from("exam_sessions")
          .update({ answers: updatedAnswers })
          .eq("student_id", studentId);

        return NextResponse.json({ reply: "" });
      }

      if (lower === "start" && existingSession?.status === "AWAITING_START") {

        const now = Date.now();

        const paper = await callGemini(
          [
            { role: "system", content: GLOBAL_CONTEXT },
            {
              role: "user",
              content: `
Generate a NEW CBSE question paper.

Class: ${student?.class ?? ""}
Topic: ${existingSession.subject_request}
Time Allowed: ${existingSession.duration_minutes} minutes
Follow CBSE board pattern strictly.
Mention Total Marks.
`,
            },
          ],
          0.7
        );

        await supabase
          .from("exam_sessions")
          .update({
            status: "IN_EXAM",
            question_paper: paper,
            started_at: now,
          })
          .eq("student_id", studentId);

        return NextResponse.json({
          reply: paper,
          startTime: now,
          durationMinutes: existingSession.duration_minutes,
        });
      }

      if (looksLikeSubjectRequest(lower)) {

        const duration = calculateDurationMinutes(message);

        await supabase
          .from("exam_sessions")
          .upsert({
            student_id: studentId,
            status: "AWAITING_START",
            subject_request: message,
            duration_minutes: duration,
            answers: [],
          });

        return NextResponse.json({
          reply: `Subject noted. Type START to begin your exam.`,
        });
      }

      return NextResponse.json({
        reply: `Hi ${student?.name ?? "Student"} of Class ${student?.class ?? "?"}. Please tell me the subject and chapters for your test.`
      });
    }

    /* ================= OTHER MODES ================= */

    if (mode === "teacher") {
      const reply = await callGemini([
        { role: "system", content: GLOBAL_CONTEXT },
        { role: "system", content: TEACHER_PROMPT },
        { role: "system", content: studentContext },
        ...fullConversation,
      ]);
      return NextResponse.json({ reply });
    }

    if (mode === "oral") {
      const reply = await callGemini([
        { role: "system", content: GLOBAL_CONTEXT },
        { role: "system", content: ORAL_PROMPT },
        { role: "system", content: studentContext },
        ...fullConversation,
      ]);
      return NextResponse.json({ reply });
    }

    if (mode === "progress") {
      const reply = await callGemini([
        { role: "system", content: GLOBAL_CONTEXT },
        { role: "system", content: PROGRESS_PROMPT },
        { role: "system", content: studentContext },
        ...fullConversation,
      ]);
      return NextResponse.json({ reply });
    }

    return NextResponse.json({ reply: "Invalid mode." });

  } catch (err) {
    console.error("API ERROR:", err);
    return NextResponse.json(
      { reply: "AI server error. Please try again." },
      { status: 500 }
    );
  }
}
