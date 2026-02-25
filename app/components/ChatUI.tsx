"use client";
import { useEffect, useRef, useState } from "react";

type Message = { role: "user" | "assistant"; content: string };
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

export const PDF_MARKER = "__DOWNLOAD_PDF__::";

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

// ── Light markdown renderer (bold only) ───────────────────
function renderText(text: string): React.ReactNode {
  const lines = text.split("\n");
  return lines.map((line, i) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g).map((p, j) =>
      p.startsWith("**") && p.endsWith("**")
        ? <strong key={j}>{p.slice(2, -2)}</strong>
        : p
    );
    return <span key={i}>{parts}{i < lines.length - 1 && <br />}</span>;
  });
}

// ── PDF Download Card ──────────────────────────────────────
function PDFDownloadCard({ paperContent, subject }: { paperContent: string; subject?: string }) {
  const [downloading, setDownloading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(false);

  async function handleDownload() {
    setDownloading(true); setError(false);
    try {
      const res = await fetch("/api/generate-pdf", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: paperContent }),
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = subject ? `${subject.replace(/\s+/g, "-")}-paper.pdf` : "shauri-paper.pdf";
      a.click(); URL.revokeObjectURL(url); setDone(true);
    } catch { setError(true); }
    setDownloading(false);
  }

  return (
    <div style={{
      background: "#eff6ff", border: "1.5px solid #bfdbfe", borderRadius: 14,
      padding: "16px 20px", display: "flex", alignItems: "center",
      justifyContent: "space-between", gap: 16,
    }}>
      <div>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#1d4ed8", marginBottom: 4 }}>
          📄 Question Paper Ready
        </div>
        <div style={{ fontSize: 14, color: "#3b82f6" }}>
          {done ? "Downloaded! Answer directly in chat." : "Download printable copy, or answer in chat."}
        </div>
        {error && <div style={{ fontSize: 13, color: "#dc2626", marginTop: 4 }}>⚠️ Download failed.</div>}
      </div>
      <button onClick={handleDownload} disabled={downloading} style={{
        padding: "10px 20px", background: done ? "#059669" : downloading ? "#94a3b8" : "#2563eb",
        color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700,
        cursor: downloading ? "not-allowed" : "pointer", whiteSpace: "nowrap", flexShrink: 0,
      }}>
        {done ? "✅ Downloaded" : downloading ? "Generating…" : "⬇ Download PDF"}
      </button>
    </div>
  );
}

// ── Elapsed timer ──────────────────────────────────────────
function useElapsed(startTime?: number) {
  const [elapsed, setElapsed] = useState("");
  useEffect(() => {
    if (!startTime) return;
    const tick = () => {
      const s = Math.floor((Date.now() - startTime) / 1000);
      const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
      setElapsed(h > 0 ? `${h}h ${m}m ${sec}s` : m > 0 ? `${m}m ${sec}s` : `${sec}s`);
    };
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id);
  }, [startTime]);
  return elapsed;
}

// ── Dictionary Panel ───────────────────────────────────────
function DictionaryPanel() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [dictMode, setDictMode] = useState<"dictionary" | "thesaurus">("dictionary");
  const [history, setHistory] = useState<Array<{ word: string; result: string; mode: string }>>([]);

  async function lookup() {
    const word = query.trim();
    if (!word) return;
    setLoading(true); setResult(null);
    const prompt = dictMode === "dictionary"
      ? `Define "${word}" for a student: part of speech, clear meaning, one example. Max 60 words, plain text only.`
      : `Synonyms and antonyms for "${word}". Format: SYNONYMS: w1, w2, w3 | ANTONYMS: w1, w2 | TIP: usage note. Max 50 words.`;
    try {
      const res = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "teacher", message: prompt, history: [], student: {} }),
      });
      const data = await res.json();
      const text = data?.reply || "No result.";
      setResult(text);
      setHistory(prev => [{ word, result: text, mode: dictMode }, ...prev.slice(0, 7)]);
    } catch { setResult("⚠️ Could not fetch."); }
    setLoading(false);
  }

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#f8fafc", borderLeft: "1.5px solid #e2e8f0" }}>
      <div style={{ padding: "14px 14px 10px", borderBottom: "1px solid #e2e8f0", background: "#fff", flexShrink: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", marginBottom: 10, letterSpacing: "0.06em" }}>
          📖 REFERENCE
        </div>
        <div style={{ display: "flex", gap: 3, marginBottom: 10, background: "#f1f5f9", borderRadius: 8, padding: 3 }}>
          {(["dictionary", "thesaurus"] as const).map(m => (
            <button key={m} onClick={() => setDictMode(m)} style={{
              flex: 1, padding: "6px 0", background: dictMode === m ? "#2563eb" : "transparent",
              color: dictMode === m ? "#fff" : "#64748b", border: "none", borderRadius: 5,
              fontSize: 12, fontWeight: 600, cursor: "pointer",
            }}>
              {m === "dictionary" ? "Dict" : "Thesaurus"}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <input
            value={query} onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === "Enter" && lookup()}
            placeholder="Search word…"
            style={{ flex: 1, padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14, outline: "none", background: "#f8fafc" }}
          />
          <button onClick={lookup} disabled={loading} style={{
            padding: "8px 12px", background: loading ? "#94a3b8" : "#2563eb", color: "#fff",
            border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
          }}>{loading ? "…" : "Go"}</button>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px" }}>
        {loading && <div style={{ color: "#64748b", fontSize: 14 }}>Looking up <em>{query}</em>…</div>}
        {result && !loading && (
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "12px 14px", marginBottom: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#2563eb", marginBottom: 6 }}>{query}</div>
            <div style={{ fontSize: 14, color: "#334155", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{result}</div>
          </div>
        )}
        {history.length > 0 && !loading && (
          <>
            <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, letterSpacing: "0.08em", marginBottom: 6 }}>RECENT</div>
            {history.map((h, i) => (
              <button key={i} onClick={() => { setQuery(h.word); setResult(h.result); setDictMode(h.mode as any); }} style={{
                display: "block", width: "100%", textAlign: "left", padding: "7px 10px", marginBottom: 4,
                background: "#f8fafc", border: "1px solid #f1f5f9", borderRadius: 8, fontSize: 13, color: "#475569", cursor: "pointer",
              }}>
                <strong>{h.word}</strong>
                <span style={{ opacity: 0.5, marginLeft: 6, fontSize: 11 }}>{h.mode}</span>
              </button>
            ))}
          </>
        )}
        {!result && !loading && history.length === 0 && (
          <div style={{ color: "#94a3b8", fontSize: 14, lineHeight: 1.7 }}>Look up any word for definitions, synonyms & antonyms.</div>
        )}
      </div>
    </div>
  );
}

// ── Message bubble ─────────────────────────────────────────
function Bubble({ m }: { m: Message }) {
  const isUser = m.role === "user";
  const { uploaded, text } = splitUploadedContent(m.content);
  return (
    <div style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", marginBottom: 14 }}>
      <div style={{
        maxWidth: "76%", padding: "14px 18px",
        borderRadius: isUser ? "20px 20px 5px 20px" : "20px 20px 20px 5px",
        background: isUser ? "#38bdf8" : "#f1f5f9",
        color: isUser ? "#ffffff" : "#0f172a",
        fontSize: 16, lineHeight: 1.75,
        boxShadow: "0 1px 3px rgba(0,0,0,0.07)",
      }}>
        {uploaded && <div style={{ fontSize: 13, marginBottom: 6, opacity: 0.75 }}>📎 File attached</div>}
        {renderText(text || m.content)}
      </div>
    </div>
  );
}

// ── Examiner Split View ────────────────────────────────────
function ExaminerSplitView({ messages, examMeta, elapsed }: {
  messages: Message[]; examMeta?: Props["examMeta"]; elapsed: string;
}) {
  const chatRef = useRef<HTMLDivElement>(null);

  const paperMessage = messages.find(m =>
    m.role === "assistant" && !m.content.startsWith(PDF_MARKER) &&
    (m.content.includes("SECTION A") || m.content.includes("Maximum Marks") || m.content.includes("General Instructions"))
  );
  const chatMessages = messages.filter(m => m !== paperMessage && !m.content.startsWith(PDF_MARKER));

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [chatMessages.length]);

  const examActive = examMeta?.startTime && !examMeta?.examEnded;

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
      {/* LEFT: Paper */}
      <div style={{ width: "50%", height: "100%", overflowY: "auto", borderRight: "1.5px solid #e2e8f0", background: "#fff", padding: "24px 28px", flexShrink: 0 }}>
        {examActive && (
          <div style={{
            position: "sticky", top: 0, zIndex: 10, background: "#0f172a", color: "#38bdf8",
            padding: "10px 16px", borderRadius: 10, marginBottom: 20,
            fontFamily: "monospace", fontSize: 14, display: "flex", justifyContent: "space-between",
          }}>
            <span>⏱ <strong>{elapsed}</strong></span>
            {examMeta?.subject && <span style={{ opacity: 0.7 }}>📚 {examMeta.subject}</span>}
          </div>
        )}
        {paperMessage ? (
          <div style={{ fontSize: 15, lineHeight: 1.9, color: "#0f172a", fontFamily: "monospace", whiteSpace: "pre-wrap" }}>
            {paperMessage.content.split("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")[0].trim()}
          </div>
        ) : (
          <div style={{ color: "#94a3b8", fontSize: 15, textAlign: "center", paddingTop: 60 }}>
            {examMeta?.startTime ? "Loading question paper…" : "Your question paper will appear here after you type start."}
          </div>
        )}
      </div>
      {/* RIGHT: Chat */}
      <div style={{ width: "50%", height: "100%", display: "flex", flexDirection: "column", background: "#f8fafc" }}>
        <div style={{
          padding: "13px 20px", borderBottom: "1px solid #e2e8f0", background: "#fff",
          fontSize: 14, fontWeight: 600, color: "#475569",
          display: "flex", alignItems: "center", gap: 8, flexShrink: 0,
        }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: examActive ? "#22c55e" : "#94a3b8", display: "inline-block" }} />
          {examMeta?.examEnded ? "Evaluation Complete" : examActive ? "Type your answers here" : "Examiner Chat"}
        </div>
        {examMeta?.examEnded && (
          <div style={{ background: "#f0fdf4", borderBottom: "1px solid #bbf7d0", padding: "12px 20px", fontSize: 14, flexShrink: 0 }}>
            <strong style={{ color: "#15803d" }}>✅ Submitted</strong>
            {" · "}{examMeta.marksObtained}/{examMeta.totalMarks} ({examMeta.percentage}%)
          </div>
        )}
        <div ref={chatRef} style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
          {chatMessages.map((m, i) => <Bubble key={i} m={m} />)}
          {chatMessages.length === 0 && (
            <div style={{ color: "#94a3b8", fontSize: 15, textAlign: "center", paddingTop: 40 }}>
              {examActive ? "Type or upload your answers here. Answer in any order." : "Chat will appear here."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── MAIN EXPORT ────────────────────────────────────────────
export default function ChatUI({ messages, mode = "teacher", examMeta }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const elapsed = useElapsed(examMeta?.startTime);

  useEffect(() => {
    if (mode === "examiner") return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, mode]);

  if (mode === "examiner") {
    return <ExaminerSplitView messages={messages} examMeta={examMeta} elapsed={elapsed} />;
  }

  if (mode === "teacher") {
    return (
      <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 32px", minWidth: 0 }}>
          {messages.map((m, i) => {
            if (!m?.role || !m?.content) return null;
            if (m.content.startsWith(PDF_MARKER)) return (
              <div key={i} style={{ marginBottom: 16 }}>
                <PDFDownloadCard paperContent={m.content.slice(PDF_MARKER.length)} subject={examMeta?.subject} />
              </div>
            );
            return <Bubble key={i} m={m} />;
          })}
          <div ref={bottomRef} style={{ height: 100 }} />
        </div>
        <div style={{ width: 260, flexShrink: 0, height: "100%", overflowY: "auto" }}>
          <DictionaryPanel />
        </div>
      </div>
    );
  }

  // All other modes
  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "24px 20px" }}>
      {messages.map((m, i) => {
        if (!m?.role || !m?.content) return null;
        if (m.content.startsWith(PDF_MARKER)) return (
          <div key={i} style={{ marginBottom: 16 }}>
            <PDFDownloadCard paperContent={m.content.slice(PDF_MARKER.length)} subject={examMeta?.subject} />
          </div>
        );
        return <Bubble key={i} m={m} />;
      })}
      <div ref={bottomRef} />
    </div>
  );
}