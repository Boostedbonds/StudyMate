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
- CBSE syllabus
- CBSE board pattern
Never go outside syllabus.
Never assume subject.
`;

/* ================= TEACHER PROMPT ================= */

const TEACHER_PROMPT = `
You are a real class teacher + mentor.

RULES:

1. If greeting → reply briefly, ask what to study
2. If doubt → explain step-by-step
3. If casual talk → respond + gently bring back to study

NEVER:
- Assume subject
- Start teaching without being asked
- Give long notes

STYLE:
- Simple
- Short
- Human tone

SCORING MODE:
- Use keywords
- Point-wise answers

Ask 2 short questions ONLY after teaching.
`;

/* ================= EXAMINER PROMPT ================= */

const EXAMINER_PROMPT = `
You are a strict CBSE examiner.

PAPER:
- Full syllabus coverage
- Balanced difficulty
- Sections (MCQ, short, long)

EVALUATION:
- Strict NCERT checking
- No guessing
- No free marks

Return JSON:
{
 "marksObtained": number,
 "totalMarks": number,
 "percentage": number,
 "detailedEvaluation": "strict checking"
}
`;

/* ================= MEMORY ================= */

async function updateWeakness(studentId: string, topic: string) {
  if (!topic) return;

  const { data } = await supabase
    .from("student_memory")
    .select("*")
    .eq("student_id", studentId)
    .eq("topic", topic)
    .maybeSingle();

  if (data) {
    await supabase
      .from("student_memory")
      .update({
        weakness_level: Math.min((data.weakness_level ?? 1) + 1, 5),
      })
      .eq("id", data.id);
  } else {
    await supabase.from("student_memory").insert({
      student_id: studentId,
      topic,
      weakness_level: 1,
    });
  }
}

async function getWeakTopics(studentId: string) {
  const { data } = await supabase
    .from("student_memory")
    .select("topic")
    .eq("student_id", studentId)
    .limit(3);

  return data || [];
}

/* ================= GEMINI ================= */

async function callGemini(messages: ChatMessage[], temperature = 0.3) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return "API key missing";

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: messages.map((m) => ({
          role: "user",
          parts: [{ text: m.content }],
        })),
        generationConfig: { temperature },
      }),
    }
  );

  const data = await res.json();

  return (
    data?.candidates?.[0]?.content?.parts?.[0]?.text ||
    "Unable to generate response."
  );
}

/* ================= JSON PARSER ================= */

function parseJSON(text: string) {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : null;
  } catch {
    return null;
  }
}

/* ================= API ================= */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const mode = body?.mode ?? "";

    let student: StudentContext = body?.student;

    if (!student?.name || !student?.class) {
      const name = req.cookies.get("shauri_name")?.value;
      const cls = req.cookies.get("shauri_class")?.value;

      if (name && cls) {
        student = {
          name: decodeURIComponent(name),
          class: decodeURIComponent(cls),
          board: "CBSE",
        };
      }
    }

    const message = body?.message ?? "";
    const lower = message.toLowerCase();

    let studentId: string | null = null;

    if (student?.name && student?.class) {
      const { data } = await supabase
        .from("students")
        .select("id")
        .eq("name", student.name)
        .eq("class", student.class)
        .maybeSingle();

      if (data) studentId = data.id;
    }

    /* ================= TEACHER ================= */

    if (mode === "teacher") {
      const weakTopics = studentId
        ? await getWeakTopics(studentId)
        : [];

      const reply = await callGemini([
        { role: "system", content: GLOBAL_CONTEXT },
        { role: "system", content: TEACHER_PROMPT },
        { role: "user", content: message },
      ]);

      if (
        studentId &&
        (lower.includes("confused") || lower.includes("not clear"))
      ) {
        await updateWeakness(studentId, message.slice(0, 50));
      }

      return NextResponse.json({ reply });
    }

    /* ================= EXAMINER ================= */

    if (mode === "examiner") {
      if (!studentId)
        return NextResponse.json({ reply: "Student missing." });

      const { data: session } = await supabase
        .from("exam_sessions")
        .select("*")
        .eq("student_id", studentId)
        .maybeSingle();

      if (!session) {
        await supabase.from("exam_sessions").insert({
          student_id: studentId,
          status: "AWAITING",
        });

        return NextResponse.json({
          reply: "Tell me subject and chapters.",
        });
      }

      if (lower === "start") {
        const paper = await callGemini([
          { role: "system", content: GLOBAL_CONTEXT },
          { role: "system", content: EXAMINER_PROMPT },
          { role: "user", content: session.subject_request },
        ]);

        await supabase
          .from("exam_sessions")
          .update({
            status: "IN_EXAM",
            question_paper: paper,
            answers: [],
          })
          .eq("student_id", studentId);

        return NextResponse.json({ reply: paper });
      }

      if (session.status === "IN_EXAM") {
        if (lower.includes("submit")) {
          const result = await callGemini([
            { role: "system", content: GLOBAL_CONTEXT },
            { role: "system", content: EXAMINER_PROMPT },
            {
              role: "user",
              content: `Paper: ${session.question_paper}\nAnswers:${session.answers.join("\n")}`,
            },
          ]);

          const parsed = parseJSON(result);

          return NextResponse.json({
            reply:
              parsed?.detailedEvaluation +
              `\nScore: ${parsed?.marksObtained}/${parsed?.totalMarks}`,
          });
        }

        await supabase
          .from("exam_sessions")
          .update({
            answers: [...(session.answers || []), message],
          })
          .eq("student_id", studentId);

        return NextResponse.json({ reply: "" });
      }

      await supabase
        .from("exam_sessions")
        .update({
          subject_request: message,
        })
        .eq("student_id", studentId);

      return NextResponse.json({
        reply: "Subject saved. Type START.",
      });
    }

    return NextResponse.json({ reply: "Invalid mode" });

  } catch (e) {
    console.error(e);
    return NextResponse.json({ reply: "Server error" });
  }
}