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
You are Shauri, strictly aligned to NCERT and CBSE.
Never go outside syllabus.
`;

/* ================= TEACHER PROMPT ================= */

const TEACHER_PROMPT = `
You are in TEACHER MODE.

DO NOT assume subject.
Let student decide what to study.

If student asks ANY academic question → answer it.

Teach step-by-step, simple, structured, keyword-based.

Ask 2 short questions at end.
`;

/* ================= EXAMINER PROMPT ================= */

const EXAMINER_PROMPT = `
You are a STRICT CBSE BOARD EXAMINER.

Rules:
- No leniency
- Only NCERT correctness
- No assumption

Format:

Q1: (2/2) ✔
Q2: (1/3) Missing concept: ___
Q3: (0/2) Incorrect

FINAL:
Marks Obtained: X
Total Marks: Y
Percentage: Z%
`;

/* ================= GEMINI ================= */

async function callGemini(messages: ChatMessage[], temperature = 0.3) {
  const apiKey = process.env.GEMINI_API_KEY;

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
      }),
    }
  );

  const data = await res.json();

  return (
    data?.candidates?.[0]?.content?.parts?.[0]?.text ??
    "Error generating response"
  );
}

/* ================= API ================= */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const mode = body.mode;
    const message = body.message || "";

    let student: StudentContext = body.student || {};

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

    /* ================= EXAMINER MODE ================= */

    if (mode === "examiner") {

      // STEP 1: Ask subject properly
      if (!message || message.toLowerCase() === "hi") {
        return NextResponse.json({
          reply: `Tell me the subject and chapters for your test (e.g., "Science Chapter 1–3").`,
        });
      }

      // STEP 2: START EXAM
      if (message.toLowerCase().includes("start")) {

        const paper = await callGemini([
          { role: "system", content: GLOBAL_CONTEXT },
          {
            role: "user",
            content: `
Generate a STRICT CBSE question paper.

Class: ${student.class}
Subject/Chapters: ${message}

Rules:
- Cover ALL topics mentioned
- Balanced difficulty
- Section A: MCQ
- Section B: Short answers
- Section C: Long answers
- Section D: Case-based

Mention total marks & time.
No answers.
`,
          },
        ]);

        return NextResponse.json({ reply: paper });
      }

      // STEP 3: SUBMIT
      if (message.toLowerCase().includes("submit")) {

        const evaluation = await callGemini([
          { role: "system", content: GLOBAL_CONTEXT },
          { role: "system", content: EXAMINER_PROMPT },
          {
            role: "user",
            content: `Evaluate strictly:\n${message}`,
          },
        ]);

        return NextResponse.json({ reply: evaluation });
      }

      return NextResponse.json({
        reply: `Type START to begin test or SUBMIT after writing answers.`,
      });
    }

    /* ================= TEACHER MODE ================= */

    if (mode === "teacher") {

      const reply = await callGemini([
        { role: "system", content: GLOBAL_CONTEXT },
        { role: "system", content: TEACHER_PROMPT },
        {
          role: "system",
          content: `Student: ${student.name}, Class: ${student.class}`,
        },
        { role: "user", content: message },
      ]);

      return NextResponse.json({ reply });
    }

    return NextResponse.json({ reply: "Invalid mode" });

  } catch (e) {
    return NextResponse.json({ reply: "Server error" });
  }
}