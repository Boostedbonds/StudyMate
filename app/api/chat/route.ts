import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../lib/supabase";

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

const examSessions = new Map<string, ExamSession>();

function getKey(student?: StudentContext) {
  return `${student?.name || "anon"}_${student?.class || "x"}`;
}

function isGreeting(text: string) {
  return /^(hi|hello|hey)\b/i.test(text);
}

function isSubmit(text: string) {
  return /^(submit|done|finish|finished)\b/i.test(text);
}

function isStart(text: string) {
  return text.trim().toLowerCase() === "start";
}

function looksLikeSubject(text: string) {
  return /math|science|history|geo|civics|english|hindi|chapter|physics|chemistry|biology|sst|social/i.test(text);
}

// ✅ Parse score from AI evaluation text e.g. "Total: 18/25" or "Score: 18 out of 25"
function parseScore(text: string): { obtained: number; total: number } {
  const match =
    text.match(/(\d+)\s*\/\s*(\d+)/) ||
    text.match(/(\d+)\s+out of\s+(\d+)/i);
  if (match) {
    return { obtained: parseInt(match[1]), total: parseInt(match[2]) };
  }
  return { obtained: 0, total: 0 };
}

async function callAI(systemPrompt: string, messages: ChatMessage[]) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return "AI error: missing API key";

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemPrompt }],
          },
          contents: messages
            .filter((m) => m.role !== "system")
            .map((m) => ({
              role: m.role === "assistant" ? "model" : "user",
              parts: [{ text: m.content || "" }],
            })),
        }),
      }
    );

    const data = await res.json();
    return (
      data?.candidates?.[0]?.content?.parts?.[0]?.text || "Unable to respond."
    );
  } catch {
    return "AI server error.";
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const mode: string = body?.mode || "";
    const student: StudentContext = body?.student || {};
    const name = student?.name || "Student";
    const cls = student?.class || "";
    const board = student?.board || "CBSE";

    const history: ChatMessage[] = Array.isArray(body?.history)
      ? body.history
      : [];

    const message: string =
      body?.message ||
      history.filter((m) => m.role === "user").pop()?.content ||
      "";

    const lower = message.toLowerCase().trim();
    const key = getKey(student);

    const conversation: ChatMessage[] = [
      ...history.slice(-6),
      { role: "user", content: message },
    ];

    /* ================= TEACHER ================= */

    if (mode === "teacher") {
      if (isGreeting(lower) && history.length === 0) {
        return NextResponse.json({
          reply: `Hi ${name} 👋 What would you like to learn today?`,
        });
      }

      const systemPrompt = `
You are Shauri, a real ${board} school teacher.

Student name: ${name}
Student class: ${cls}
Board: ${board} / NCERT

STRICT RULES:
- Teach ONLY what the student asks
- MAX 4-5 lines per reply
- Use examples appropriate for Class ${cls} level
- NO filler like "Great question!" or "Let's get started"
- NO asking "what do you want to learn" if topic is already given
- If student asks your name → say "I'm Shauri, your ${board} tutor"
- If student asks their name → say "You're ${name}, Class ${cls} student"
- If student asks their syllabus → confirm ${board} Class ${cls} syllabus
- Start explanation immediately when a topic is given
- End with one short question to check understanding (optional)
- Stay strictly within NCERT syllabus for Class ${cls}
- Adapt complexity to Class ${cls} level — don't over-explain or under-explain
      `.trim();

      const reply = await callAI(systemPrompt, conversation);
      return NextResponse.json({ reply });
    }

    /* ================= EXAMINER ================= */

    if (mode === "examiner") {
      const session = examSessions.get(key) || { status: "IDLE", answers: [] };

      if (isGreeting(lower) && session.status === "IDLE") {
        return NextResponse.json({
          reply: `Hello ${name}! I'm your examiner.\nTell me the subject and chapters you want to be tested on.`,
        });
      }

      if (isSubmit(lower) && session.status === "IN_EXAM") {
        const systemPrompt = `
You are a strict CBSE examiner evaluating a Class ${cls} student named ${name}.
- Check each answer against the question
- Give marks per question clearly e.g. "Q1: 3/5"
- Give brief feedback per answer
- End with TOTAL SCORE in format: "Total: X/Y"
- Be encouraging but honest
        `.trim();

        const evaluation = await callAI(systemPrompt, [
          {
            role: "user",
            content: `Question Paper:\n${session.questionPaper}\n\nStudent Answers:\n${session.answers.join("\n\n")}`,
          },
        ]);

        // ✅ FIXED: parse real score instead of hardcoded 60
        const { obtained, total } = parseScore(evaluation);
        const percentage = total > 0 ? Math.round((obtained / total) * 100) : 0;

        await supabase.from("exam_attempts").insert({
          student_name: name,
          class: cls,
          subject: session.subject || "General",
          percentage,
          marks_obtained: obtained,
          total_marks: total,
          created_at: new Date().toISOString(),
        });

        examSessions.delete(key);

        return NextResponse.json({
          reply: evaluation,
          examEnded: true,
          subject: session.subject,
          chapters: [],
          marksObtained: obtained,
          totalMarks: total,
        });
      }

      if (session.status === "IN_EXAM") {
        session.answers.push(message);
        examSessions.set(key, session);
        return NextResponse.json({
          reply: "✅ Answer recorded. Continue with the next question, or type **submit** when done.",
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
          reply: `Got it! I'll prepare a paper for: **${message}**\nType **start** when you're ready.`,
        });
      }

      if (isStart(lower) && session.status === "READY") {
        const systemPrompt = `
You are a strict CBSE examiner for Class ${cls}.
Generate a complete question paper only. No explanation. No extra words.
Format:
Subject: [subject]
Class: ${cls}
Time: [appropriate time]
Total Marks: [total]

Section A – MCQ (1 mark each)
Section B – Short Answer (3 marks each)
Section C – Long Answer (5 marks each)
        `.trim();

        const paper = await callAI(systemPrompt, [
          {
            role: "user",
            content: `${board} Class ${cls} — ${session.subjectRequest}`,
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

        return NextResponse.json({
          reply: paper,
          startTime: Date.now(),
        });
      }

      return NextResponse.json({
        reply: "Please tell me the subject and chapters you want to be tested on.",
      });
    }

    /* ================= ORAL ================= */

    if (mode === "oral") {
      const systemPrompt = `
You are Shauri in ORAL quiz mode.

Student: ${name}, Class ${cls}, Board: ${board}

RULES:
- Short conversational replies only (2-3 lines max)
- Ask ONE question at a time
- Give instant feedback on the student's answer before asking next question
- Adapt difficulty to Class ${cls} level
- Stay within NCERT ${board} syllabus for Class ${cls}
- Be warm and encouraging
      `.trim();

      const reply = await callAI(systemPrompt, conversation);
      return NextResponse.json({ reply });
    }

    /* ================= PROGRESS ================= */

    if (mode === "progress") {
      const attempts = body?.attempts || [];

      const systemPrompt = `
You are an academic advisor analyzing a CBSE student's performance.

Student: ${name}, Class ${cls}

RULES:
- Max 5 lines
- Mention specific subjects by name
- Clear strengths with subject names
- Clear weaknesses with subject names
- One concrete improvement suggestion
- Be encouraging and motivating
      `.trim();

      const reply = await callAI(systemPrompt, [
        {
          role: "user",
          content: `Here are ${name}'s exam attempts:\n${JSON.stringify(attempts, null, 2)}`,
        },
      ]);

      return NextResponse.json({ reply });
    }

    return NextResponse.json({ reply: "Invalid mode." });
  } catch {
    return NextResponse.json(
      { reply: "Server error. Try again." },
      { status: 500 }
    );
  }
}