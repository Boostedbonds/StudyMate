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

/* ================= GLOBAL ================= */

const GLOBAL_CONTEXT = `
You are Shauri, strictly aligned to NCERT & CBSE.
Never go outside syllabus.
Never guess class.
`;

/* ================= TEACHER ================= */

const TEACHER_PROMPT = `
You are a HUMAN CBSE teacher.

BEHAVIOR:

1. If student says "hi", "hello", "how are you":
→ Respond naturally like:
"Hi {name}! Ready to study?"

2. DO NOT start teaching unless asked.

3. If student chats casually:
→ Reply briefly
→ Then gently guide back:
"Let's get back to studies — what topic?"

4. Teaching:
- Step by step
- Simple language
- Small explanation only
- No long paragraphs

5. Ask 2 short questions ONLY when teaching

6. NEVER behave like:
- notes generator
- robot
- example template
`;

/* ================= EXAMINER ================= */

const EXAMINER_PROMPT = `
You are a REAL CBSE examiner.

RULES:

1. DO NOT assume subject
2. Wait for clear input like:
   "Class 9 Science Chapter 1"

3. Ignore messages like:
   hi, hello, ok

4. If unclear → ask:
"Please specify subject and chapters."

5. If student asks doubt:
→ Answer it (do NOT reject)

6. When subject given:
→ Say: "Subject noted. Type START"

7. On START:
→ Generate FULL CBSE paper:
- All chapters covered
- Proper sections
- 80 marks
- Real difficulty

8. On SUBMIT:
→ Evaluate strictly
→ Show:
Marks Obtained: X/Y
Percentage: Z%
Detailed feedback
`;

/* ================= HELPERS ================= */

function isGreeting(text: string) {
  return ["hi", "hello", "hey"].includes(text);
}

function isSubject(text: string) {
  return (
    text.includes("class") ||
    text.includes("chapter") ||
    text.includes("science") ||
    text.includes("math") ||
    text.includes("history")
  );
}

/* ================= GEMINI ================= */

async function callGemini(messages: ChatMessage[]) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return "AI error.";

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
  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "Error.";
}

/* ================= API ================= */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const mode = body?.mode ?? "";

    /* ================= STUDENT ================= */

    let student: StudentContext = body?.student || {};

    if (!student.name || !student.class) {
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

    const studentName = student?.name || "Student";
    const studentClass = student?.class || "";

    /* ================= MESSAGE ================= */

    const history: ChatMessage[] = body?.history || [];
    const message: string = body?.message || "";
    const lower = message.toLowerCase().trim();

    /* ================= GET STUDENT ID ================= */

    let studentId: string | null = null;

    if (student.name && student.class) {
      const { data } = await supabase
        .from("students")
        .select("id")
        .eq("name", student.name)
        .eq("class", student.class)
        .maybeSingle();

      if (data?.id) studentId = data.id;
    }

    /* ================= TEACHER MODE ================= */

    if (mode === "teacher") {
      // GREETING FIX
      if (isGreeting(lower)) {
        return NextResponse.json({
          reply: `Hi ${studentName}! Ready to learn today?`,
        });
      }

      // CASUAL CHAT FIX
      if (!isSubject(lower)) {
        return NextResponse.json({
          reply: `Got it 👍 but let's focus — what subject or chapter do you want to study?`,
        });
      }

      const reply = await callGemini([
        { role: "system", content: GLOBAL_CONTEXT },
        { role: "system", content: TEACHER_PROMPT },
        {
          role: "system",
          content: `Student: ${studentName}, ${studentClass}`,
        },
        ...history,
        { role: "user", content: message },
      ]);

      return NextResponse.json({ reply });
    }

    /* ================= EXAMINER MODE ================= */

    if (mode === "examiner") {
      if (!studentId) {
        return NextResponse.json({
          reply: "Please login again.",
        });
      }

      // IGNORE GREETING
      if (isGreeting(lower)) {
        return NextResponse.json({
          reply: "Please tell subject and chapters.",
        });
      }

      // IF NORMAL QUESTION → ANSWER
      if (!isSubject(lower) && lower !== "start") {
        const reply = await callGemini([
          { role: "system", content: GLOBAL_CONTEXT },
          {
            role: "system",
            content: "Answer this doubt clearly (CBSE level)",
          },
          { role: "user", content: message },
        ]);

        return NextResponse.json({ reply });
      }

      // SUBJECT INPUT
      if (isSubject(lower)) {
        await supabase.from("exam_sessions").upsert({
          student_id: studentId,
          subject_request: message,
          status: "AWAITING_START",
        });

        return NextResponse.json({
          reply: "Subject noted. Type START",
        });
      }

      // START
      if (lower === "start") {
        const { data } = await supabase
          .from("exam_sessions")
          .select("*")
          .eq("student_id", studentId)
          .maybeSingle();

        if (!data?.subject_request) {
          return NextResponse.json({
            reply: "Please provide subject first.",
          });
        }

        const paper = await callGemini([
          { role: "system", content: GLOBAL_CONTEXT },
          { role: "system", content: EXAMINER_PROMPT },
          {
            role: "user",
            content: `Create full CBSE paper for ${data.subject_request}`,
          },
        ]);

        return NextResponse.json({ reply: paper });
      }

      return NextResponse.json({
        reply: "Tell subject and chapters.",
      });
    }

    return NextResponse.json({ reply: "Invalid mode." });
  } catch (err) {
    return NextResponse.json({ reply: "Server error." });
  }
}