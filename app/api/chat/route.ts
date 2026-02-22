import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../lib/supabase";

/* ================= TYPES ================= */

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

/* ================= GLOBAL CONTEXT ================= */

const GLOBAL_CONTEXT = `
You are Shauri, strictly aligned to:
- NCERT textbooks
- CBSE syllabus
- Board exam pattern
Never go outside CBSE.
`;

/* ================= PROMPTS ================= */

const TEACHER_PROMPT = `
You are in TEACHER MODE.

Rules:
- Speak like a real classroom teacher (warm, human, natural)
- No robotic or repeated greetings
- Use student's name naturally (not every line)
- Keep answers short (2–4 lines)
- Be clear, simple, and engaging
- Stay strictly within NCERT/CBSE
- If student goes off-topic → gently guide back
`;

const EXAMINER_PROMPT = `
You are a STRICT CBSE BOARD EXAMINER.

RULES:
- Generate FULL question paper in ONE response
- Include sections, marks, instructions (CBSE format)
- NO explanations, NO interaction after paper
- Silent exam mode after paper

For evaluation:
Return ONLY JSON:
{
  "marksObtained": number,
  "totalMarks": number,
  "percentage": number,
  "detailedEvaluation": "strict CBSE-style feedback"
}
`;

/* ================= HELPERS ================= */

function extractSubject(text: string) {
  const t = text.toLowerCase();

  if (t.includes("geo")) return "Geography";
  if (t.includes("hist")) return "History";
  if (t.includes("civics")) return "Civics";
  if (t.includes("eco")) return "Economics";
  if (t.includes("math")) return "Mathematics";
  if (t.includes("sci")) return "Science";

  return null;
}

function extractChapters(text: string) {
  const match = text.match(/chapter[s]?\s*([0-9 ,]+)/i);
  if (!match) return [];

  return match[1]
    .split(/,|\s+/)
    .map((n) => n.trim())
    .filter(Boolean);
}

/* ================= GEMINI ================= */

async function callGemini(messages: ChatMessage[]) {
  const apiKey = process.env.GEMINI_API_KEY;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: messages.map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        })),
      }),
    }
  );

  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || "Error";
}

/* ================= API ================= */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const mode = body?.mode;
    const message = body?.message || "";
    const lower = message.toLowerCase();

    const name = decodeURIComponent(req.cookies.get("shauri_name")?.value || "Student");
    const cls = decodeURIComponent(req.cookies.get("shauri_class")?.value || "Class");

    const studentContext = `Student Name: ${name}, Class: ${cls}`;

    /* ================= EXAMINER ================= */

    if (mode === "examiner") {
      const { data: sessions } = await supabase
        .from("exam_sessions")
        .select("*")
        .eq("student_name", name)
        .eq("class", cls)
        .neq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(1);

      let session = sessions?.[0];

      /* CREATE SESSION */
      if (!session) {
        const { data: newSession } = await supabase
          .from("exam_sessions")
          .insert({
            student_name: name,
            class: cls,
            status: "idle",
            answers: [],
          })
          .select()
          .single();

        return NextResponse.json({
          reply: `Alright ${name}, which subject would you like to take a test in today?`,
        });
      }

      /* IDLE → SUBJECT */
      if (session.status === "idle") {
        const subject = extractSubject(message);
        const chapters = extractChapters(message);

        if (!subject) {
          return NextResponse.json({
            reply: `Tell me the subject clearly (like Geography, History, Science).`,
          });
        }

        await supabase
          .from("exam_sessions")
          .update({ subject, chapters, status: "ready" })
          .eq("id", session.id);

        return NextResponse.json({
          reply: `Got it — ${subject}. When you're ready, type START.`,
        });
      }

      /* READY → START */
      if (session.status === "ready") {
        if (!/\b(start|begin)\b/.test(lower)) {
          return NextResponse.json({
            reply: `Type START whenever you're ready to begin.`,
          });
        }

        const paper = await callGemini([
          { role: "system", content: GLOBAL_CONTEXT },
          { role: "system", content: EXAMINER_PROMPT },
          { role: "system", content: studentContext },
          {
            role: "user",
            content: `Create a complete CBSE question paper for ${session.subject} for ${cls}.`,
          },
        ]);

        await supabase
          .from("exam_sessions")
          .update({
            paper,
            status: "started",
            started_at: new Date().toISOString(),
            duration_min: 60,
          })
          .eq("id", session.id);

        return NextResponse.json({ reply: paper });
      }

      /* STARTED → ANSWERS */
      if (session.status === "started") {
        const isSubmit = /\b(submit|done|finish|end test)\b/.test(lower);

        if (!isSubmit) {
          const { data: latest } = await supabase
            .from("exam_sessions")
            .select("answers")
            .eq("id", session.id)
            .single();

          const updatedAnswers = [...(latest?.answers || []), message];

          await supabase
            .from("exam_sessions")
            .update({ answers: updatedAnswers })
            .eq("id", session.id);

          return NextResponse.json({ reply: "..." });
        }

        /* FETCH FINAL ANSWERS */
        const { data: finalSession } = await supabase
          .from("exam_sessions")
          .select("*")
          .eq("id", session.id)
          .single();

        const result = await callGemini([
          { role: "system", content: GLOBAL_CONTEXT },
          { role: "system", content: EXAMINER_PROMPT },
          {
            role: "user",
            content: `
Evaluate strictly as CBSE examiner.

Question Paper:
${finalSession.paper}

Student Answers:
${(finalSession.answers || []).join("\n")}
`,
          },
        ]);

        await supabase
          .from("exam_sessions")
          .update({ status: "completed" })
          .eq("id", session.id);

        return NextResponse.json({ reply: result });
      }
    }

    /* ================= TEACHER ================= */

    if (mode === "teacher") {
      const reply = await callGemini([
        { role: "system", content: GLOBAL_CONTEXT },
        { role: "system", content: TEACHER_PROMPT },
        { role: "system", content: studentContext },
        { role: "user", content: message },
      ]);

      return NextResponse.json({ reply });
    }

    return NextResponse.json({ reply: "Invalid mode" });
  } catch (e) {
    return NextResponse.json({ reply: "Server error" }, { status: 500 });
  }
}