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

/* ================= TEACHER PROMPT (MENTOR + ADAPTIVE + HUMAN) ================= */

const TEACHER_PROMPT = `
You are in TEACHER MODE.

You are a real Class Teacher + Mentor.

=====================
CORE BEHAVIOR
=====================

1. If student asks ANY academic question → answer immediately.

2. If student sends casual messages:
- respond like a human teacher
- keep it short
- gently bring them back to studies

Example:
"Of course 😊 you're my student. Now tell me, what would you like to study?"

3. Never force topic.
4. Never ignore student message.
5. Never repeat same question again.

=====================
TEACHING STYLE
=====================

- Step-by-step
- Simple language
- Short explanations
- Use examples
- Use NCERT keywords naturally

=====================
SCORING MODE
=====================

If question is exam-type:
- Use point-wise answers
- Include keywords
- Follow marks structure

=====================
ENGAGEMENT
=====================

Ask exactly 2 short questions after explanation.

=====================
TONE
=====================

- Human
- Supportive
- Calm
- Never robotic
`;

/* ================= HELPERS ================= */

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
        updated_at: new Date(),
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
    .select("topic, weakness_level")
    .eq("student_id", studentId)
    .order("weakness_level", { ascending: false })
    .limit(3);

  return data || [];
}

/* ================= GEMINI ================= */

async function callGemini(messages: ChatMessage[], temperature = 0.3) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return "AI configuration error.";

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

/* ================= API ================= */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const mode: string = body?.mode ?? "";

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

    const lower = message.toLowerCase();

    /* ================= FLAGS ================= */

    const isConfused =
      lower.includes("don't understand") ||
      lower.includes("confused") ||
      lower.includes("not clear");

    const isExamMode =
      lower.includes("answer") ||
      lower.includes("write") ||
      lower.includes("3 marks") ||
      lower.includes("5 marks") ||
      lower.includes("2 marks");

    const isStrict =
      lower.includes("strict") || lower.includes("examiner style");

    /* ================= CONTEXT ================= */

    const studentContext = `
Student Name: ${student?.name ?? "Student"}
Class: ${student?.class ?? ""}
Board: CBSE
`;

    const fullConversation: ChatMessage[] = [
      ...history,
      { role: "user", content: message },
    ];

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

    /* ================= TEACHER MODE ================= */

    if (mode === "teacher") {
      let weakTopicsList: any[] = [];

      if (studentId) {
        weakTopicsList = await getWeakTopics(studentId);
      }

      const weakTopicsText = weakTopicsList.map(w => w.topic).join(", ");

      const shouldTriggerRevision =
        weakTopicsList.length > 0 && Math.random() < 0.3;

      let revisionInstruction = "";

      if (shouldTriggerRevision && weakTopicsText) {
        revisionInstruction = `
Revise briefly: ${weakTopicsList[0].topic}
`;
      }

      let topperInstruction = "";

      if (isExamMode) {
        topperInstruction = `
TOPPER MODE:
- Point-wise answers
- Use NCERT keywords
- 2m → 2 points, 5m → 5 points
- No extra explanation
`;
      }

      let personalityInstruction = isStrict
        ? `Be strict like a board examiner.`
        : `Be friendly like a supportive teacher.`;

      const reply = await callGemini([
        { role: "system", content: GLOBAL_CONTEXT },
        { role: "system", content: TEACHER_PROMPT },
        { role: "system", content: studentContext },
        { role: "system", content: `Weak Topics: ${weakTopicsText || "None"}` },
        { role: "system", content: revisionInstruction },
        { role: "system", content: topperInstruction },
        { role: "system", content: personalityInstruction },
        ...fullConversation,
      ]);

      if (isConfused && studentId) {
        await updateWeakness(studentId, message.slice(0, 60));
      }

      return NextResponse.json({ reply });
    }

    /* ================= DEFAULT ================= */

    return NextResponse.json({ reply: "Mode not supported." });

  } catch (err) {
    console.error(err);
    return NextResponse.json({ reply: "Error" });
  }
}