"use client";
import { useEffect, useRef, useState } from "react";
import ChatUI from "../components/ChatUI";
import ChatInput from "../components/ChatInput";

type Message = { role: "user" | "assistant"; content: string };

export default function TeacherPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const greetingFiredRef = useRef(false);
  const isSendingRef     = useRef(false);
  const sessionIdRef     = useRef<string>(crypto.randomUUID());

  useEffect(() => {
    if (greetingFiredRef.current) return;
    greetingFiredRef.current = true;
    sendToAPI("hi", undefined, undefined, true);
  }, []);

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
          mode: "teacher", message: text,
          uploadedText: uploadedText || "", uploadType: uploadType || null,
          history: isGreeting ? [] : messages.map(m => ({ role: m.role, content: m.content })),
          student: { ...student, sessionId: sessionIdRef.current },
        }),
      });
      const data = await res.json();
      const reply = typeof data?.reply === "string" ? data.reply : "";
      if (reply) setMessages(prev => [...prev, { role: "assistant", content: reply }]);
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
    setMessages(prev => [...prev, { role: "user", content: text.trim() }]);
    await sendToAPI(text, uploadedText, uploadType);
  }

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden", background: "#f8fafc" }}>
      {/* Top bar */}
      <div style={{
        height: 52, display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 20px", background: "#fff", borderBottom: "1px solid #e2e8f0", flexShrink: 0,
      }}>
        <button onClick={() => window.location.href = "/modes"} style={{
          padding: "7px 14px", background: "#f1f5f9", color: "#374151",
          borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, cursor: "pointer", fontWeight: 600,
        }}>← Back</button>
        <span style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>📚 Teacher Mode</span>
        <div style={{ width: 80 }} />
      </div>

      {/* Chat area fills remaining height */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        <ChatUI messages={messages} mode="teacher" />
      </div>

      {/* Loading dots */}
      {isLoading && (
        <div style={{
          padding: "8px 32px", background: "#fff", borderTop: "1px solid #f1f5f9",
          fontSize: 14, color: "#64748b", display: "flex", alignItems: "center", gap: 6, flexShrink: 0,
        }}>
          <span style={{ animation: "pulse 1s infinite" }}>●</span>
          <span style={{ animation: "pulse 1s 0.2s infinite" }}>●</span>
          <span style={{ animation: "pulse 1s 0.4s infinite" }}>●</span>
        </div>
      )}

      {/*
        ChatInput is fixed-bottom (inline=false default).
        It renders full-width centered up to 740px — sits nicely
        in the 80% chat area since dictionary is on the right.
        We shift it left slightly to align with chat, not dictionary.
      */}
      <div style={{ paddingBottom: 88 }} /> {/* spacer so last message isn't hidden behind input */}
      <ChatInput onSend={handleSend} disabled={isLoading} />
    </div>
  );
}