import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../lib/supabase";
import { systemPrompt } from "../../lib/prompts";
import { syllabus } from "../../lib/syllabus";

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

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

type ChapterEntry = { number: number; name: string };

// ─────────────────────────────────────────────────────────────
// HELPERS & VALIDATION
// ─────────────────────────────────────────────────────────────

const VALID_BOARDS = ["CBSE", "ICSE", "IB"];
const MIN_CLASS = 6;
const MAX_CLASS = 12;

function sanitiseBoard(raw: string): string {
  const upper = (raw || "").toUpperCase().trim();
  return VALID_BOARDS.includes(upper) ? upper : "CBSE";
}

function sanitiseClass(raw: string): string {
  const n = parseInt(raw);
  if (isNaN(n)) return String(syllabus.class || 9);
  return String(Math.min(Math.max(n, MIN_CLASS), MAX_CLASS));
}

async function getSession(key: string): Promise<ExamSession | null> {
  try {
    const { data, error } = await supabase
      .from("exam_sessions")
      .select("*")
      .eq("session_key", key)
      .single();
    if (error || !data) return null;
    return {
      ...data,
      answer_log: Array.isArray(data.answer_log) ? data.answer_log : [],
    } as ExamSession;
  } catch { return null; }
}

async function saveSession(session: ExamSession): Promise<void> {
  try {
    await supabase.from("exam_sessions").upsert(
      { ...session, updated_at: new Date().toISOString() },
      { onConflict: "session_key" }
    );
  } catch (e) { console.error("saveSession failed:", e); }
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
}

function parseTotalMarksFromPaper(paper: string): number {
  const match = paper.match(/(?:maximum\s*marks?|total\s*marks?)\s*[:\-]\s*(\d+)/i);
  return match ? parseInt(match[1]) : 80;
}

function sanitiseUpload(raw: string): string {
  return raw.slice(0, 8000).replace(/system\s*:/gi, "").trim();
}

function getChaptersForSubject(subjectRequest: string, studentClass: string) {
  const req = subjectRequest.toLowerCase();
  const s = syllabus.subjects;
  // Simplified logic for brevity - matches your existing structure
  let name = subjectRequest;
  let list = "Standard NCERT Syllabus";

  if (/science/.test(req)) { name = "Science"; list = s.science.chapters.map((c: any) => c.name).join(", "); }
  else if (/math/.test(req)) { name = "Mathematics"; list = s.mathematics.chapters.map((c: any) => c.name).join(", "); }
  
  return { subjectName: name, chapterList: list };
}

// ─────────────────────────────────────────────────────────────
// AI CALLER
// ─────────────────────────────────────────────────────────────

async function callAI(sysPrompt: string, messages: ChatMessage[], timeoutMs = 30000): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return "AI error: missing API key.";
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: sysPrompt }] },
        contents: messages.filter(m => m.role !== "system").map(m => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content || "" }],
        })),
      }),
    });
    const data = await res.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || "Unable to respond.";
  } catch { return "AI server error."; }
}

// ─────────────────────────────────────────────────────────────
// SYLLABUS EXTRACTION
// ─────────────────────────────────────────────────────────────

async function parseSyllabusFromUpload(text: string, cls: string): Promise<{ subjectName: string; raw: string }> {
  const prompt = `Extract the PRIMARY subject name and chapter list from this text for Class ${cls}. Format: SUBJECT: <name> followed by CHAPTERS: <list>.`;
  const extracted = await callAI(prompt, [{ role: "user", content: text }]);
  const subjectMatch = extracted.match(/^SUBJECT:\s*(.+)$/im);
  return {
    subjectName: subjectMatch ? subjectMatch[1].trim() : "Custom Subject",
    raw: extracted
  };
}

// ─────────────────────────────────────────────────────────────
// MAIN POST HANDLER
// ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const mode = body?.mode || "teacher";
    const student: StudentContext = body?.student || {};
    const cls = sanitiseClass(student?.class || "");
    const board = sanitiseBoard(student?.board || "");
    const name = student?.name?.trim() || "Student";
    const message = body?.message || "";
    const lower = message.toLowerCase().trim();
    
    // Check for base64 images (Syllabus or Answer)
    let processedText = body?.uploadedText || "";
    const uploadType = body?.uploadType;

    // 1. Handle Teacher Mode
    if (mode === "teacher") {
      const reply = await callAI(systemPrompt("teacher"), [...(body.history || []), { role: "user", content: message }]);
      return NextResponse.json({ reply });
    }

    // 2. Handle Examiner Mode
    const key = `${student.name || "anon"}_${cls}`;
    let session = (await getSession(key)) || {
      session_key: key,
      status: "IDLE",
      answer_log: [],
      student_name: name,
      student_class: cls,
      student_board: board,
    };

    // --- UPLOAD LOGIC (FIXES THE LOOP) ---
    if (uploadType === "syllabus" && processedText) {
      const { subjectName, raw } = await parseSyllabusFromUpload(processedText, cls);
      session.status = "READY";
      session.subject = subjectName;
      session.syllabus_from_upload = raw;
      await saveSession(session);
      return NextResponse.json({
        reply: `📄 **Syllabus uploaded successfully!**\n\n**Subject:** ${subjectName}\n\nType **start** to begin the exam.`
      });
    }

    // --- STATE MACHINE ---
    
    // Start Exam
    if (lower === "start" && (session.status === "IDLE" || session.status === "READY")) {
      const subjectToUse = session.subject || body.confirmedSubject || "General Science";
      const { chapterList } = getChaptersForSubject(subjectToUse, cls);
      
      const paperPrompt = `Generate a CBSE Class ${cls} ${board} exam paper for ${subjectToUse}. Syllabus: ${session.syllabus_from_upload || chapterList}. Include Section A (MCQs), B (Short), C (Long). Total 80 marks.`;
      const paper = await callAI(systemPrompt("examiner"), [{ role: "user", content: paperPrompt }]);
      
      session.status = "IN_EXAM";
      session.subject = subjectToUse;
      session.question_paper = paper;
      session.started_at = Date.now();
      session.total_marks = parseTotalMarksFromPaper(paper);
      await saveSession(session);

      return NextResponse.json({
        reply: `🚀 Exam started! Your paper is ready.`,
        questionPaper: paper,
        startTime: session.started_at,
        status: "IN_EXAM"
      });
    }

    // Handle Answers during Exam
    if (session.status === "IN_EXAM") {
      if (lower === "submit") {
        // Evaluation logic here (omitted for brevity, but move your Evaluation prompt here)
        session.status = "IDLE"; // Reset after done
        await saveSession(session);
        return NextResponse.json({ reply: "✅ Exam submitted! Evaluating..." });
      }

      // Default: Store text/image as an answer entry
      session.answer_log.push(processedText || message);
      await saveSession(session);
      return NextResponse.json({ reply: `✍️ Answer recorded (${session.answer_log.length}). Continue or type **submit**.` });
    }

    // Default Greeting / Fallback
    const greeting = `Hello ${name}! 📋 I'm your ${board} Examiner. Type a subject (e.g., Science) or upload a syllabus to begin.`;
    return NextResponse.json({ reply: greeting });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ reply: "Error processing request." }, { status: 500 });
  }
}