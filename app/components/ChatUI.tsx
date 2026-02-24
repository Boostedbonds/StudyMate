"use client";
import { useEffect, useRef, useState } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type Props = {
  messages: Message[];
  isOralMode?: boolean;
  language?: "en-IN" | "hi-IN";
  mode?: "teacher" | "examiner" | "oral" | "practice" | "revision" | "progress";
  examMeta?: {
    startTime?: number;
    examEnded?: boolean;
    marksObtained?: number;
    totalMarks?: number;
    percentage?: number;
    timeTaken?: string;
    subject?: string;
  };
};

// ── Fix 3: match BOTH markers used in route.ts ──────────────
const UPLOAD_MARKERS = [
  "[UPLOADED STUDY MATERIAL / ANSWER SHEET]",
  "[UPLOADED ANSWER — IMAGE/PDF]",
];

function splitUploadedContent(content: string) {
  for (const marker of UPLOAD_MARKERS) {
    if (content.includes(marker)) {
      const [text, uploaded = ""] = content.split(marker);
      return { uploaded: uploaded.trim() || null, text: text.trim() };
    }
  }
  return { uploaded: null, text: content };
}

// ── Elapsed timer hook ───────────────────────────────────────
function useElapsed(startTime?: number) {
  const [elapsed, setElapsed] = useState("");

  useEffect(() => {
    if (!startTime) return;
    function tick() {
      const ms = Date.now() - startTime!;
      const s = Math.floor(ms / 1000);
      const h = Math.floor(s / 3600);
      const m = Math.floor((s % 3600) / 60);
      const sec = s % 60;
      setElapsed(
        h > 0
          ? `${h}h ${m}m ${sec}s`
          : m > 0
          ? `${m}m ${sec}s`
          : `${sec}s`
      );
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startTime]);

  return elapsed;
}

export default function ChatUI({
  messages,
  isOralMode = false,
  language = "en-IN",
  mode = "teacher",
  examMeta,
}: Props) {
  const lastSpokenIndexRef = useRef<number>(-1);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);

  // ── Fix 1: live exam timer from startTime ────────────────
  const elapsed = useElapsed(examMeta?.startTime);

  /* ── Voice selection ─────────────────────────────────────── */
  useEffect(() => {
    if (!("speechSynthesis" in window)) return;

    function pickVoice() {
      const voices = window.speechSynthesis.getVoices();
      const femaleVoice = voices.find(
        (v) => v.lang === language && /female|woman|zira|samantha|google/i.test(v.name)
      );
      setSelectedVoice(femaleVoice ?? voices.find((v) => v.lang === language) ?? null);
    }

    pickVoice();
    window.speechSynthesis.addEventListener("voiceschanged", pickVoice);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", pickVoice);
  }, [language]);

  /* ── Speak new assistant messages ────────────────────────── */
  useEffect(() => {
    // ── Fix 4: never TTS in examiner mode ──────────────────
    if (!isOralMode || mode === "examiner") return;
    if (!("speechSynthesis" in window)) return;

    const lastIndex = messages.length - 1;
    const lastMessage = messages[lastIndex];

    if (lastMessage?.role !== "assistant" || lastIndex === lastSpokenIndexRef.current) return;

    window.speechSynthesis.cancel();
    const { text } = splitUploadedContent(lastMessage.content);
    const utterance = new SpeechSynthesisUtterance(text || lastMessage.content);
    utterance.lang = language;
    utterance.rate = 0.95;
    utterance.pitch = 1;
    if (selectedVoice) utterance.voice = selectedVoice;

    window.speechSynthesis.speak(utterance);
    lastSpokenIndexRef.current = lastIndex;

    return () => window.speechSynthesis.cancel();
  }, [messages, isOralMode, mode, language, selectedVoice]);

  /* ── Auto-scroll ─────────────────────────────────────────── */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ── Render ──────────────────────────────────────────────── */
  if (messages.length === 0) {
    return (
      <div style={{ textAlign: "center", color: "#94a3b8", padding: "48px 0" }}>
        No messages yet.
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "720px", margin: "0 auto", padding: "24px 12px" }}>

      {/* ── Fix 1: live timer bar (exam only) ──────────────── */}
      {mode === "examiner" && examMeta?.startTime && !examMeta.examEnded && (
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 10,
            background: "#0f172a",
            color: "#38bdf8",
            padding: "8px 16px",
            borderRadius: "10px",
            marginBottom: "16px",
            fontFamily: "monospace",
            fontSize: "14px",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span>⏱️ Time elapsed: <strong>{elapsed}</strong></span>
          {examMeta.subject && <span>📚 {examMeta.subject}</span>}
        </div>
      )}

      {/* ── Fix 2: exam result banner ───────────────────────── */}
      {examMeta?.examEnded && (
        <div
          style={{
            background: "#f0fdf4",
            border: "2px solid #22c55e",
            borderRadius: "12px",
            padding: "16px 20px",
            marginBottom: "20px",
            fontSize: "15px",
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: "8px", color: "#15803d" }}>
            ✅ Exam Submitted
          </div>
          <div>Subject: <strong>{examMeta.subject}</strong></div>
          <div>
            Score: <strong>{examMeta.marksObtained} / {examMeta.totalMarks}</strong>
            {" "}({examMeta.percentage}%)
          </div>
          <div>Time taken: <strong>{examMeta.timeTaken}</strong></div>
        </div>
      )}

      {messages.map((m, i) => {
        const { uploaded, text } = splitUploadedContent(m.content);
        const isUser = m.role === "user";

        return (
          <div
            key={i}
            style={{
              marginBottom: "16px",
              display: "flex",
              justifyContent: isUser ? "flex-end" : "flex-start",
            }}
          >
            <div
              style={{
                background: isUser ? "#38bdf8" : "#f1f5f9",
                color: isUser ? "white" : "#0f172a",
                padding: "14px 18px",
                borderRadius: "16px",
                maxWidth: "85%",
                fontSize: "15px",
                lineHeight: "1.6",
                whiteSpace: "pre-wrap",
              }}
            >
              {uploaded && (
                <div style={{ fontSize: "13px", marginBottom: "8px", opacity: 0.85 }}>
                  📎 Uploaded file included
                </div>
              )}
              {text || m.content}
            </div>
          </div>
        );
      })}

      <div ref={bottomRef} />
    </div>
  );
}