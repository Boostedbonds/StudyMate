"use client";
import { useEffect, useRef, useState } from "react";
import ChatUI, { PDF_MARKER } from "../components/ChatUI";
import ChatInput from "../components/ChatInput";

type Message = { role: "user" | "assistant"; content: string };

type ExamAttempt = {
  id: string; date: string; mode: "examiner";
  subject: string; chapters: string[];
  marksObtained: number; totalMarks: number;
  scorePercent?: number; timeTakenSeconds: number;
  rawAnswerText: string;
};

export default function ExaminerPage() {
  const [messages, setMessages]   = useState<Message[]>([]);
  const [examStarted, setExamStarted] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [examMeta, setExamMeta]   = useState<{
    startTime?: number; examEnded?: boolean;
    marksObtained?: number; totalMarks?: number;
    percentage?: number; timeTaken?: string; subject?: string;
  }>({});

  const timerRef         = useRef<NodeJS.Timeout | null>(null);
  const startTimestampRef = useRef<number | null>(null);
  const elapsedRef       = useRef(0);
  const sessionIdRef     = useRef<string>(crypto.randomUUID());
  const greetingFiredRef = useRef(false);
  const isSendingRef     = useRef(false);

  useEffect(() => {
    if (greetingFiredRef.current) return;
    greetingFiredRef.current = true;
    const key = `shauri_greeted_${sessionIdRef.current}`;
    if (!sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, "1");
      sendToAPI("", undefined, undefined, true);
    }
  }, []);

  function startTimer(serverStartTime: number) {
    if (timerRef.current) return;
    startTimestampRef.current = serverStartTime;
    setExamStarted(true);
    setExamMeta(prev => ({ ...prev, startTime: serverStartTime }));
    timerRef.current = setInterval(() => {
      if (startTimestampRef.current) {
        const diff = Math.floor((Date.now() - startTimestampRef.current) / 1000);
        elapsedRef.current = diff;
        setElapsedSeconds(diff);
      }
    }, 1000);
  }

  function stopTimer() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setExamStarted(false);
  }

  useEffect(() => () => stopTimer(), []);

  function formatTime(s: number) {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    return `${h}h ${m}m ${sec}s`;
  }

  function saveExamAttempt(allMessages: Message[], timeTaken: number, subject: string, chapters: string[], marksObtained: number, totalMarks: number) {
    const attempt: ExamAttempt = {
      id: crypto.randomUUID(), date: new Date().toISOString(), mode: "examiner",
      subject, chapters, marksObtained, totalMarks,
      scorePercent: totalMarks > 0 ? Math.round((marksObtained / totalMarks) * 100) : 0,
      timeTakenSeconds: timeTaken,
      rawAnswerText: allMessages.filter(m => m.role === "user").map(m => m.content).join("\n\n"),
    };
    try {
      const existing = localStorage.getItem("shauri_exam_attempts");
      const parsed: ExamAttempt[] = existing ? JSON.parse(existing) : [];
      parsed.push(attempt);
      localStorage.setItem("shauri_exam_attempts", JSON.stringify(parsed));
    } catch {}
  }

  async function sendToAPI(text: string, uploadedText?: string, uploadType?: "syllabus" | "answer", isGreeting = false) {
    if (isSendingRef.current) return;
    isSendingRef.current = true;
    setIsLoading(true);

    let student: any = null;
    try { student = JSON.parse(localStorage.getItem("shauri_student") || "null"); } catch {}

    try {
      const res = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "examiner",
          message: isGreeting ? "hi" : text,
          uploadedText: uploadedText || "",
          uploadType: uploadType || null,
          history: isGreeting ? [] : messages
            .filter(m => !m.content.startsWith(PDF_MARKER))
            .map(m => ({
              role: m.role,
              content: m.content
                .replace(/\n\n📋 \[Syllabus uploaded\]/g, "")
                .replace(/\n\n📝 \[Answer uploaded\]/g, "")
                .trim(),
            })),
          student: { ...student, sessionId: sessionIdRef.current },
        }),
      });

      const data = await res.json();
      const aiReply: string = typeof data?.reply === "string" ? data.reply : "";

      // Exam started — generate paper
      if (typeof data?.startTime === "number") {
        startTimer(data.startTime);
        const subjectMatch = aiReply.match(/Subject\s*[:\|]\s*(.+)/i);
        const detectedSubject = subjectMatch ? subjectMatch[1].trim() : data?.subject;
        setExamMeta(prev => ({ ...prev, startTime: data.startTime, subject: detectedSubject }));
        if (aiReply) {
          const paperOnly = aiReply.split("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")[0].trim();
          setMessages(prev => [
            ...prev,
            { role: "assistant", content: aiReply },
            { role: "assistant", content: `${PDF_MARKER}${paperOnly}` },
          ]);
        }
        return;
      }

      // Exam ended
      if (data?.examEnded === true) {
        stopTimer();
        const timeTaken = elapsedRef.current;
        setMessages(prev => [...prev, { role: "assistant", content: aiReply + `\n\n⏱ Time Taken: ${formatTime(timeTaken)}` }]);
        setExamMeta(prev => ({
          ...prev, examEnded: true,
          marksObtained: data?.marksObtained ?? 0,
          totalMarks: data?.totalMarks ?? 0,
          percentage: data?.percentage ?? 0,
          timeTaken: data?.timeTaken ?? formatTime(timeTaken),
          subject: data?.subject ?? prev.subject,
        }));
        saveExamAttempt(messages, timeTaken, data?.subject ?? "Exam", data?.chapters ?? [], data?.marksObtained ?? 0, data?.totalMarks ?? 0);
        return;
      }

      if (aiReply) setMessages(prev => [...prev, { role: "assistant", content: aiReply }]);

    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "⚠️ Network error. Please try again." }]);
    } finally {
      isSendingRef.current = false;
      setIsLoading(false);
    }
  }

  async function handleSend(text: string, uploadedText?: string, uploadType?: "syllabus" | "answer") {
    if (!text.trim() && !uploadedText) return;
    if (isSendingRef.current) return;
    let displayContent = text.trim();
    if (uploadedText) {
      const label = uploadType === "syllabus" ? "📋 [Syllabus uploaded]" : "📝 [Answer uploaded]";
      displayContent = displayContent ? `${displayContent}\n\n${label}` : label;
    }
    setMessages(prev => [...prev, { role: "user", content: displayContent }]);
    await sendToAPI(text, uploadedText, uploadType);
  }

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden", background: "#f8fafc" }}>

      {/* Top bar */}
      <div style={{
        height: 52, display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 20px", background: "#fff", borderBottom: "1px solid #e2e8f0", flexShrink: 0, zIndex: 20,
      }}>
        <button onClick={() => window.location.href = "/modes"} style={{
          padding: "7px 14px", background: "#f1f5f9", color: "#374151",
          borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, cursor: "pointer", fontWeight: 600,
        }}>← Back</button>
        <span style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>📋 Examiner Mode</span>
        {examStarted ? (
          <div style={{
            background: "#0f172a", color: "#38bdf8",
            padding: "6px 14px", borderRadius: 8,
            fontFamily: "monospace", fontSize: 14, fontWeight: 700,
          }}>⏱ {formatTime(elapsedSeconds)}</div>
        ) : <div style={{ width: 80 }} />}
      </div>

      {/* Split view — fills remaining height */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        <ChatUI messages={messages} mode="examiner" examMeta={examMeta} />
      </div>

      {/* Loading indicator */}
      {isLoading && (
        <div style={{
          padding: "6px 20px", background: "#fff", borderTop: "1px solid #f1f5f9",
          fontSize: 13, color: "#64748b", display: "flex", gap: 6, flexShrink: 0,
        }}>
          <span>●</span><span>●</span><span>●</span>
        </div>
      )}

      {/* Input bar — aligned to right 50% to match answer panel */}
      <div style={{
        background: "#fff", borderTop: "1px solid #e2e8f0",
        padding: "10px 16px", display: "flex", justifyContent: "flex-end", flexShrink: 0,
      }}>
        <div style={{ width: "50%", paddingLeft: 16 }}>
          <ChatInput onSend={handleSend} examStarted={examStarted} disabled={isLoading} />
        </div>
      </div>
    </div>
  );
}