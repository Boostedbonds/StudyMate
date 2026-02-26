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
// INPUT VALIDATION
// ─────────────────────────────────────────────────────────────

const VALID_BOARDS = ["CBSE", "ICSE", "IB"];
const MIN_CLASS    = 6;
const MAX_CLASS    = 12;

function sanitiseBoard(raw: string): string {
  const upper = (raw || "").toUpperCase().trim();
  return VALID_BOARDS.includes(upper) ? upper : "CBSE";
}

function sanitiseClass(raw: string): string {
  const n = parseInt(raw);
  if (isNaN(n)) return String(syllabus.class || 9);
  return String(Math.min(Math.max(n, MIN_CLASS), MAX_CLASS));
}

// ─────────────────────────────────────────────────────────────
// SUPABASE SESSION HELPERS
// ─────────────────────────────────────────────────────────────

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
  } catch {
    return null;
  }
}

async function saveSession(session: ExamSession): Promise<void> {
  try {
    await supabase.from("exam_sessions").upsert(
      { ...session, updated_at: new Date().toISOString() },
      { onConflict: "session_key" }
    );
  } catch {
    console.error("saveSession failed for key:", session.session_key);
  }
}

// ─────────────────────────────────────────────────────────────
// SYLLABUS HELPERS (Original Logic Retained)
// ─────────────────────────────────────────────────────────────

function getChaptersForSubject(
  subjectRequest: string,
  studentClass: string
): { subjectName: string; chapterList: string } {
  const req      = subjectRequest.toLowerCase();
  const classNum = parseInt(studentClass) || 9;

  if (classNum === 9) {
    const s = syllabus.subjects;

    if (/science|physics|chemistry|biology/.test(req)) {
      return {
        subjectName: s.science.name,
        chapterList: (s.science.chapters as ChapterEntry[]).map((c) => `Chapter ${c.number}: ${c.name}`).join("\n")
      };
    }
    if (/math/.test(req)) {
      return {
        subjectName: s.mathematics.name,
        chapterList: (s.mathematics.chapters as ChapterEntry[]).map((c) => `Chapter ${c.number}: ${c.name}`).join("\n")
      };
    }
    // ... [Rest of your extensive getChaptersForSubject logic remains here]
  }

  return {
    subjectName: subjectRequest,
    chapterList: `Retrieve official NCERT Class ${classNum} ${subjectRequest} syllabus.`
  };
}

// ─────────────────────────────────────────────────────────────
// GENERAL HELPERS
// ─────────────────────────────────────────────────────────────

function getKey(student?: StudentContext): string {
  if (student?.sessionId) return student.sessionId;
  return `${student?.name || "anon"}_${student?.class || "x"}`;
}

function isGreeting(text: string) { return /^(hi|hello|hey)\b/i.test(text.trim()); }
function isSubmit(text: string) { return /^(submit|done|finish|finished)\b/i.test(text.trim()); }
function isStart(text: string) { return text.trim().toLowerCase() === "start"; }

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

// ─────────────────────────────────────────────────────────────
// CORE AI CALLER
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
        contents: messages.filter((m) => m.role !== "system").map((m) => ({
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
// SYLLABUS EXTRACTION (FIXED SUBJECT DETECTION)
// ─────────────────────────────────────────────────────────────

async function parseSyllabusFromUpload(uploadedText: string, cls: string) {
  const safe = sanitiseUpload(uploadedText);
  const extractionPrompt = `
    You are a syllabus extraction assistant for Class ${cls}.
    Identify the PRIMARY subject name clearly. 
    List every chapter or topic found. 
    Format:
    SUBJECT: <Subject Name>
    CHAPTERS:
    - <Topic 1>
    ...
  `;

  const extracted = await callAI(extractionPrompt, [{ role: "user", content: safe }]);
  const subjectMatch = extracted.match(/^SUBJECT:\s*(.+)$/im);
  const topics = extracted.split(/CHAPTERS:/i)[1] || "No topics identified.";
  
  return {
    subjectName: subjectMatch ? subjectMatch[1].trim() : "Custom Subject",
    raw: topics.trim()
  };
}

// ─────────────────────────────────────────────────────────────
// MAIN POST HANDLER
// ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const mode = body?.mode || "examiner";
    const student: StudentContext = body?.student || {};
    const cls = sanitiseClass(student?.class || "");
    const board = sanitiseBoard(student?.board || "");
    const name = student?.name?.trim() || "Student";
    const greetName = name || "there";

    const history: ChatMessage[] = Array.isArray(body?.history) ? body.history : [];
    const message: string = body?.message || history.filter((m) => m.role === "user").pop()?.content || "";
    const lower = message.toLowerCase().trim();
    
    // --- OCR Handling for Images ---
    let uploadedText = body?.uploadedText || "";
    const uploadType = body?.uploadType;

    // 1. TEACHER MODE
    if (mode === "teacher") {
      const reply = await callAI(systemPrompt("teacher"), [...history.slice(-10), { role: "user", content: message }]);
      return NextResponse.json({ reply });
    }

    // 2. EXAMINER MODE
    const key = getKey(student);
    let session = (await getSession(key)) || {
      session_key: key, status: "IDLE", answer_log: [],
      student_name: name, student_class: cls, student_board: board,
    };

    // --- FIX 1: HANDLE SYLLABUS UPLOAD IMMEDIATELY ---
    if (uploadType === "syllabus" && uploadedText) {
      const { subjectName, raw } = await parseSyllabusFromUpload(uploadedText, cls);
      session.status = "READY";
      session.subject = subjectName;
      session.syllabus_from_upload = raw; // Save the actual detected content
      await saveSession(session);

      return NextResponse.json({
        reply: `📄 **Syllabus uploaded successfully!**\n\n**Subject detected:** ${subjectName}\n\n**Topics found:**\n${raw}\n\nType **start** to begin your exam.`
      });
    }

    // --- FIX 2: HANDLE GREETINGS BASED ON STATE ---
    if (isGreeting(lower)) {
      if (session.status === "READY") {
        return NextResponse.json({ reply: `Welcome back ${greetName}! Your **${session.subject}** syllabus is ready. Type **start** to begin.` });
      }
      if (session.status === "IN_EXAM") {
        return NextResponse.json({ reply: `Your **${session.subject}** exam is in progress! Continue answering or type **submit**.` });
      }
      if (session.status === "IDLE") {
        return NextResponse.json({
          reply: `Hello ${greetName}! 📋 I'm your strict CBSE Examiner.\n\nTell me your **subject** or upload a **syllabus** to begin.`
        });
      }
    }

    // --- FIX 3: HANDLE EXAM START ---
    if (isStart(lower) && (session.status === "READY" || session.status === "IDLE")) {
      const subjectToUse = session.subject || body.confirmedSubject || "General Science";
      const { chapterList } = getChaptersForSubject(subjectToUse, cls);
      const syllabusContent = session.syllabus_from_upload || chapterList;

      const paperPrompt = `Generate a ${board} Class ${cls} exam for ${subjectToUse}. Syllabus:\n${syllabusContent}. Follow CBSE format (Section A, B, C).`;
      const paper = await callAI(systemPrompt("examiner"), [{ role: "user", content: paperPrompt }]);

      session.status = "IN_EXAM";
      session.subject = subjectToUse;
      session.question_paper = paper;
      session.started_at = Date.now();
      session.total_marks = parseTotalMarksFromPaper(paper);
      await saveSession(session);

      return NextResponse.json({
        reply: `🚀 Exam started! Good luck, ${name}.`,
        questionPaper: paper,
        startTime: session.started_at,
        status: "IN_EXAM"
      });
    }

    // 3. HANDLE ANSWERS / SUBMIT
    if (session.status === "IN_EXAM") {
      if (isSubmit(lower)) {
        // ... [Insert your Evaluation Logic Here]
        return NextResponse.json({ reply: "✅ Submission successful. Evaluating..." });
      }
      session.answer_log.push(uploadedText || message);
      await saveSession(session);
      return NextResponse.json({ reply: `Answer recorded. (${session.answer_log.length} total)` });
    }

    return NextResponse.json({ reply: "I am ready. Please provide a subject or upload a syllabus." });

  } catch (error) {
    return NextResponse.json({ reply: "Server error." }, { status: 500 });
  }
}