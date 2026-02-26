import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../lib/supabase";
import { systemPrompt } from "../../lib/prompts";
import { syllabus } from "../../lib/syllabus";

// TYPES
type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

type StudentContext = {
  name?: string;
  class?: string;
  board?: string;
  sessionId?: string;
};

type ExamSession = {
  session_key: string;
  status: "IDLE" | "READY" | "IN_EXAM" | "FAILED";
  subject_request?: string;
  subject?: string;
  question_paper?: string;
  answer_log: string[];
  started_at?: number;
  total_marks?: number;
  syllabus_from_upload?: string;
  student_name?: string;
  student_class?: string;
  student_board?: string;
};

const VALID_BOARDS = ["CBSE", "ICSE", "IB"];
const MIN_CLASS = 6;
const MAX_CLASS = 12;

function sanitiseBoard(raw: string): string {
  const upper = (raw || "").toUpperCase().trim();
  return VALID_BOARDS.includes(upper) ? upper : "CBSE";
}

function sanitiseClass(raw: string): string {
  const n = parseInt(raw);
  if (isNaN(n)) return String(syllabus.class);
  return String(Math.min(Math.max(n, MIN_CLASS), MAX_CLASS));
}

async function getSession(key: string): Promise<ExamSession | null> {
  try {
    const { data } = await supabase
      .from("exam_sessions")
      .select("*")
      .eq("session_key", key)
      .single();

    if (!data) return null;

    return {
      ...data,
      answer_log: Array.isArray(data.answer_log) ? data.answer_log : [],
    };
  } catch {
    return null;
  }
}

async function saveSession(session: ExamSession) {
  await supabase.from("exam_sessions").upsert(session, {
    onConflict: "session_key",
  });
}

function getKey(student?: StudentContext) {
  if (student?.sessionId) return student.sessionId;
  return `${student?.name || "anon"}_${student?.class || "x"}`;
}

function isGreeting(text: string) {
  return /^(hi|hello|hey)\b/i.test(text.trim());
}

function isStart(text: string) {
  return text.trim().toLowerCase() === "start";
}

// MAIN
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const mode = body?.mode || "";
    const student: StudentContext = body?.student || {};

    const name = student?.name?.trim() || "";
    const greetName = name || "there";
    const callName = name ? `, ${name}` : "";

    const cls = sanitiseClass(student?.class || "");
    const board = sanitiseBoard(student?.board || "");

    const history: ChatMessage[] = Array.isArray(body?.history)
      ? body.history
      : [];

    const message =
      body?.message ||
      history.filter((m) => m.role === "user").pop()?.content ||
      "";

    const lower = message.toLowerCase().trim();

    // ================= TEACHER =================
    if (mode === "teacher") {
      if (isGreeting(lower) && history.length === 0) {
        return NextResponse.json({
          reply: `Hi ${greetName}! 👋 I'm Shauri, your ${board} Class ${cls} teacher. What would you like to learn today?`,
        });
      }

      const reply = await fetchAI(systemPrompt("teacher"), history, message);
      return NextResponse.json({ reply });
    }

    // ================= EXAMINER =================
    if (mode === "examiner") {
      const key = getKey(student);

      let session =
        (await getSession(key)) || {
          session_key: key,
          status: "IDLE",
          answer_log: [],
        };

      // GREETING
      if (isGreeting(lower) && session.status === "IDLE") {
        return NextResponse.json({
          reply:
            `Hello ${greetName}! 📋 I'm your CBSE Examiner.\n\n` +
            `Tell me the subject OR upload syllabus.\n\n` +
            `Type **start** when ready.`,
        });
      }

      // ✅ FIXED START BLOCK
      if (isStart(lower) && session.status === "IDLE") {
        const confirmedSubject: string = body?.confirmedSubject || "";

        const subjectSource =
          confirmedSubject ||
          session.subject_request ||
          "";

        if (subjectSource) {
          const recoveredSession: ExamSession = {
            session_key: key,
            status: "READY",
            subject_request: subjectSource,
            subject: subjectSource,
            answer_log: [],
            student_name: name,
            student_class: cls,
            student_board: board,
          };

          await saveSession(recoveredSession);

          session = recoveredSession;
        } else {
          return NextResponse.json({
            reply:
              `Please tell me the subject first${callName}.\n\n` +
              `Science | Mathematics | SST | English | Hindi`,
          });
        }
      }

      // READY → START PAPER
      if (isStart(lower) && session.status === "READY") {
        return NextResponse.json({
          reply: `⏱️ Exam started for ${session.subject}`,
        });
      }

      return NextResponse.json({
        reply: `Please provide subject or upload syllabus.`,
      });
    }

    // ================= FALLBACK =================
    return NextResponse.json({ reply: "Invalid mode." });

  } catch (err) {
    console.error(err);
    return NextResponse.json({ reply: "Server error." }, { status: 500 });
  }
}

// SIMPLE AI CALL
async function fetchAI(prompt: string, history: ChatMessage[], message: string) {
  return "AI response"; // unchanged placeholder
}