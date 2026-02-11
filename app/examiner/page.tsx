"use client";

import { useEffect, useRef, useState } from "react";
import ChatUI from "../components/ChatUI";
import ChatInput from "../components/ChatInput";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type ExamAttempt = {
  id: string;
  date: string;
  mode: "examiner";
  subject: string;
  chapters: string[];
  timeTakenSeconds: number;
  rawAnswerText: string;
};

export default function ExaminerPage() {
  const [messages, setMessages] = useState<Message[]>([]);

  /* ================= TIMER STATE ================= */

  const [examStarted, setExamStarted] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimestampRef = useRef<number | null>(null);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  /* ================= AUTO SCROLL ================= */

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ================= TIMER LOGIC ================= */

  function startTimer(defaultMinutes: number = 60) {
    if (timerRef.current) return;

    const totalSeconds = defaultMinutes * 60;
    setRemainingSeconds(totalSeconds);
    setExamStarted(true);

    startTimestampRef.current = Date.now();

    timerRef.current = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          stopTimer();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  function stopTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setExamStarted(false);
  }

  useEffect(() => {
    return () => stopTimer();
  }, []);

  function formatTime(seconds: number) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hrs}h ${mins}m`;
  }

  /* ================= SAVE ATTEMPT ================= */

  function saveExamAttempt(allMessages: Message[], timeTaken: number) {
    const answerText = allMessages
      .filter((m) => m.role === "user")
      .map((m) => m.content)
      .join("\n\n");

    const attempt: ExamAttempt = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      mode: "examiner",
      subject: "Exam",
      chapters: [],
      timeTakenSeconds: timeTaken,
      rawAnswerText: answerText,
    };

    try {
      const existing = localStorage.getItem("studymate_exam_attempts");
      const parsed: ExamAttempt[] = existing ? JSON.parse(existing) : [];
      parsed.push(attempt);
      localStorage.setItem(
        "studymate_exam_attempts",
        JSON.stringify(parsed)
      );
    } catch {
      // silent fail
    }
  }

  /* ================= HANDLE SEND ================= */

  async function handleSend(text: string, uploadedText?: string) {
    if (!text.trim() && !uploadedText) return;

    let userContent = "";

    if (uploadedText) {
      userContent += `
[UPLOADED ANSWER SHEET]
${uploadedText}
`;
    }

    userContent += text.trim();

    const userMessage: Message = {
      role: "user",
      content: userContent.trim(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);

    let student = null;
    try {
      const stored = localStorage.getItem("studymate_student");
      if (stored) student = JSON.parse(stored);
    } catch {
      student = null;
    }

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "examiner",
        messages: updatedMessages,
        student,
      }),
    });

    const data = await res.json();
    const aiReply: string = typeof data?.reply === "string" ? data.reply : "";

    /* ===== START TIMER WHEN PAPER GENERATED ===== */

    if (typeof data?.startTime === "number" && !examStarted) {
      // default 60 min if backend doesn't send duration
      startTimer(60);
    }

    /* ===== EXAM ENDED ===== */

    if (data?.examEnded === true) {
      stopTimer();

      const end = Date.now();
      const start = startTimestampRef.current ?? end;
      const usedSeconds = Math.floor((end - start) / 1000);

      saveExamAttempt(updatedMessages, usedSeconds);
    }

    if (aiReply) {
      setMessages([
        ...updatedMessages,
        { role: "assistant", content: aiReply },
      ]);
    } else {
      setMessages(updatedMessages);
    }
  }

  /* ================= UI ================= */

  return (
    <div
      style={{
        minHeight: "100vh",
        paddingTop: 24,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ paddingLeft: 24, marginBottom: 16 }}>
        <button
          onClick={() => (window.location.href = "/modes")}
          style={{
            padding: "10px 16px",
            background: "#2563eb",
            color: "#ffffff",
            borderRadius: 12,
            border: "none",
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          ← Back
        </button>
      </div>

      {examStarted && (
        <div
          style={{
            position: "fixed",
            top: 16,
            right: 24,
            background: "#0f172a",
            color: "#ffffff",
            padding: "10px 18px",
            borderRadius: 12,
            fontSize: 18,
            fontWeight: 600,
            zIndex: 100,
          }}
        >
          ⏱ {formatTime(remainingSeconds)}
        </div>
      )}

      <h1 style={{ textAlign: "center", marginBottom: 16 }}>
        Examiner Mode
      </h1>

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          paddingBottom: 96,
        }}
      >
        <ChatUI messages={messages} />
        <div ref={bottomRef} />
      </div>

      <div
        style={{
          position: "sticky",
          bottom: 0,
          background: "#f8fafc",
          paddingBottom: 16,
        }}
      >
        <ChatInput onSend={handleSend} />
      </div>
    </div>
  );
}
