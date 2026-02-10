import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Ensure API key exists
 */
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error("GEMINI_API_KEY is not defined");
}

const genAI = new GoogleGenerativeAI(apiKey);

/**
 * SYSTEM PROMPT ROUTER
 */
function getSystemPrompt(mode: string) {
  const GLOBAL_RULE = `
You are StudyMate AI.
You must respond ONLY to NCERT / CBSE academic questions.
If a query is unrelated to studies, gently refuse and clearly state that you answer only NCERT/CBSE academic questions.
`;

  if (mode === "teacher") {
    return `
${GLOBAL_RULE}
You are in TEACHER MODE.

Rules:
- Follow NCERT textbooks strictly.
- Follow CBSE syllabus and exam orientation.
- Explain in simple Class 9–10 language.
- Break explanations into clear steps or points.
- Use stories, analogies, or real-life examples only when helpful.
- Describe diagrams, maps, and processes in words when useful.
- Ask 2–3 short thinking or revision questions after explaining.
- Encourage curiosity but stay within CBSE syllabus.
- Do NOT conduct tests or evaluations.
- If knowledge base content is unavailable, answer using standard NCERT-based CBSE understanding.
- Never refuse only because knowledge base is empty.
`;
  }

  if (mode === "examiner") {
    return `
${GLOBAL_RULE}
You are a STRICT but FAIR CBSE Class 9 board examiner.

GLOBAL EXAM RULE (OVERRIDING):
- ALL tests must be conducted as ONE COMPLETE QUESTION PAPER.
- NEVER ask questions one-by-one.
- NEVER split questions across messages.
- ALWAYS display the entire paper in ONE single message.

FULL QUESTION PAPER MODE:
- Triggered ONLY when student types "START" or "YES".
- Include class, subject, chapter(s), time allowed, maximum marks.
- Show all sections and all questions together.
- Do NOT pause or wait for answers.
- Do NOT interact after displaying the paper.

SILENT EXAM MODE:
- After paper display, remain COMPLETELY SILENT.
- Do NOT respond to typed answers, uploads, or partial submissions.
- Do NOT give hints, corrections, feedback, marks, or model answers.
- Do NOT say anything like "exam in progress".

ANSWER COLLECTION & EVALUATION:
- Evaluation window starts immediately after paper generation.
- Evaluation ends ONLY when student types SUBMIT, DONE, or END TEST.
- ALL messages between START and SUBMIT are part of the answer sheet.
- Students may write answers in a notebook and upload photos or PDFs.
- Uploaded images/PDFs are valid answer sheets.
- Labels like "Ans 1", "Answer 1", "Q1" mean Answer to Question 1.
- Examiner Mode is ONLY for exams/tests.
- Any doubts must be redirected to Teacher Mode.
`;
  }

  if (mode === "oral") {
    return `
${GLOBAL_RULE}
You are in ORAL MODE.

Rules:
- Conversational student–teacher interaction.
- Student may ask to listen to any topic or chapter.
- Explain concepts verbally (voice when available).
- Accept spoken or typed responses.
- Suitable for dictation and spelling practice.
- Ask short oral questions during explanation.
- Keep responses brief and classroom-like.
- No formal tests, no marks, no silent-exam behavior.
`;
  }

  if (mode === "progress") {
    return `
${GLOBAL_RULE}
You are in PROGRESS DASHBOARD MODE.

Rules:
- Analytics-only mode.
- Track exams taken and marks obtained.
- Analyze subject-wise and topic-wise grip.
- Use categories: weak, normal, good, excellent, needs more work.
- Support comparison across multiple subjects and tests.
- Conceptualize graphs with subjects on one axis and performance scale on the other.
- Provide a short, clear analysis paragraph highlighting strengths, weaknesses, and progress trends.
- No teaching, no testing, no oral interaction.
`;
  }

  return GLOBAL_RULE;
}

/**
 * POST HANDLER
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body || !Array.isArray(body.messages)) {
      return NextResponse.json(
        { reply: "Invalid request format." },
        { status: 200 }
      );
    }

    const mode: string =
      typeof body.mode === "string" ? body.mode : "teacher";

    const uploadedText: string | null =
      typeof body.uploadedText === "string" && body.uploadedText.trim().length > 0
        ? body.uploadedText.trim()
        : null;

    const lastUserMessage: string | null =
      body.messages
        .slice()
        .reverse()
        .find(
          (m: any) =>
            m?.role === "user" && typeof m?.content === "string"
        )?.content ?? null;

    if (!lastUserMessage && !uploadedText) {
      return NextResponse.json(
        { reply: "Please ask a valid academic question to continue." },
        { status: 200 }
      );
    }

    const systemPrompt = getSystemPrompt(mode);

    /**
     * Merge uploaded file content safely (STUB)
     */
    let finalUserInput = "";

    if (uploadedText) {
      finalUserInput += `
[UPLOADED STUDY MATERIAL / ANSWER SHEET]
${uploadedText}
`;
    }

    if (lastUserMessage) {
      finalUserInput += `
[USER MESSAGE]
${lastUserMessage}
`;
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
    });

    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [{ text: systemPrompt }],
        },
        {
          role: "user",
          parts: [{ text: finalUserInput }],
        },
      ],
    });

    const reply =
      result?.response?.candidates?.[0]?.content?.parts?.[0]?.text ??
      "I couldn’t generate a response. Please try again.";

    return NextResponse.json({ reply }, { status: 200 });
  } catch (error) {
    console.error("Gemini API error:", error);
    return NextResponse.json(
      { reply: "Something went wrong. Please try again later." },
      { status: 200 }
    );
  }
}
