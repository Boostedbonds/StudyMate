import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../lib/supabase";

/* ================= TYPES ================= */

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

/* ================= GLOBAL CONTEXT ================= */

const GLOBAL_CONTEXT = `
You are Shauri.

Core Identity:
- You are a real human-like teacher in a classroom
- You speak naturally, not like a system or bot

Boundaries:
- For academic questions → strictly NCERT / CBSE
- For personal/basic questions → answer normally like a human

Critical Behavior:
- ALWAYS respond to EXACT user question
- NEVER ignore or override user input
- NEVER restart conversation
- NEVER give generic “let’s start” replies
`;

/* ================= TEACHER PROMPT ================= */

const TEACHER_PROMPT = `
You are in TEACHER MODE.

ABSOLUTE RULES:
1. Answer EXACTLY what the student asked
2. If question = "what is your name"
   → reply naturally (e.g., "I'm Shauri, your learning companion.")
3. DO NOT redirect
4. DO NOT give generic study intro
5. DO NOT behave like first message every time

STYLE:
- Human, warm, classroom tone
- Short responses (1–3 lines)
- No robotic phrasing
- No repetition

FAIL-SAFE:
If you are about to give a generic reply → STOP and answer the question directly instead.
`;

/* ================= EXAMINER PROMPT ================= */

const EXAMINER_PROMPT = `
You are a STRICT CBSE BOARD EXAMINER.

RULES:
- Generate FULL question paper in ONE response
- Include sections, marks, instructions
- NO interaction after paper
- Silent exam mode

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
    const message = (body?.message || "").trim();

    const name = decodeURIComponent(req.cookies.get("shauri_name")?.value || "Student");
    const cls = decodeURIComponent(req.cookies.get("shauri_class")?.value || "Class");

    const studentContext = `Student: ${name}, ${cls}`;

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

      if (!session) {
        await supabase.from("exam_sessions").insert({
          student_name: name,
          class: cls,
          status: "idle",
          answers: [],
        });

        return NextResponse.json({
          reply: `Alright ${name}, which subject would you like to be tested on?`,
        });
      }

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
          reply: `Got it — ${subject}. Type START to begin.`,
        });
      }

      if (session.status === "ready") {
        if (!/\b(start|begin)\b/.test(message.toLowerCase())) {
          return NextResponse.json({
            reply: `Type START to begin.`,
          });
        }

        const paper = await callGemini([
          {
            role: "system",
            content: `${GLOBAL_CONTEXT}\n${EXAMINER_PROMPT}\n${studentContext}`,
          },
          {
            role: "user",
            content: `Create a full CBSE paper for ${session.subject} (${cls})`,
          },
        ]);

        await supabase
          .from("exam_sessions")
          .update({
            paper,
            status: "started",
            answers: [],
          })
          .eq("id", session.id);

        return NextResponse.json({ reply: paper });
      }

      if (session.status === "started") {
        const isSubmit = /\b(submit|done|finish)\b/.test(message.toLowerCase());

        if (!isSubmit) {
          const { data: latest } = await supabase
            .from("exam_sessions")
            .select("answers")
            .eq("id", session.id)
            .single();

          const updated = [...(latest?.answers || []), message];

          await supabase
            .from("exam_sessions")
            .update({ answers: updated })
            .eq("id", session.id);

          return NextResponse.json({ reply: "..." });
        }

        const { data: finalSession } = await supabase
          .from("exam_sessions")
          .select("*")
          .eq("id", session.id)
          .single();

        const result = await callGemini([
          {
            role: "system",
            content: `${GLOBAL_CONTEXT}\n${EXAMINER_PROMPT}`,
          },
          {
            role: "user",
            content: `
Evaluate strictly:

Paper:
${finalSession.paper}

Answers:
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
        {
          role: "system",
          content: `${GLOBAL_CONTEXT}\n${TEACHER_PROMPT}\n${studentContext}`,
        },
        {
          role: "user",
          content: message,
        },
      ]);

      return NextResponse.json({ reply });
    }

    return NextResponse.json({ reply: "Invalid mode" });
  } catch {
    return NextResponse.json({ reply: "Server error" }, { status: 500 });
  }
}