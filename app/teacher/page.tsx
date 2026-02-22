"use client";
import { useEffect, useState, useRef } from "react";
import ChatUI from "../components/ChatUI";
import ChatInput from "../components/ChatInput";

export type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function TeacherPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const hasInteractedRef = useRef(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("shauri_student");
      if (stored) {
        const student = JSON.parse(stored);
        const name = student?.name || "Student";
        const cls = student?.class || "";
        setMessages([
          {
            role: "assistant",
            content: `Hello ${name}! I'm Shauri, here to help you ace your Class ${cls} studies as per NCERT and CBSE. What would you like to learn today?`,
          },
        ]);
      } else {
        setMessages([
          {
            role: "assistant",
            content: "Hello! I'm Shauri. What would you like to study today?",
          },
        ]);
      }
    } catch {
      setMessages([
        {
          role: "assistant",
          content: "Hello! I'm Shauri. What would you like to study today?",
        },
      ]);
    }
  }, []);

  // ✅ Scroll ONLY after user interaction (not on initial load)
  useEffect(() => {
    if (!hasInteractedRef.current) return;

    setTimeout(() => {
      window.scrollTo({
        top: document.body.scrollHeight,
        behavior: "smooth",
      });
    }, 100);
  }, [messages.length]);

  async function handleSend(text: string, uploadedText?: string) {
    if (!text.trim() && !uploadedText) return;

    hasInteractedRef.current = true;

    let userContent = "";
    if (uploadedText) {
      userContent += `\n[UPLOADED STUDY MATERIAL / ANSWER SHEET]\n${uploadedText}\n`;
    }
    if (text.trim()) {
      userContent += text.trim();
    }

    const userMessage: Message = {
      role: "user",
      content: userContent.trim(),
    };

    const updatedMessages: Message[] = [...messages, userMessage];
    setMessages(updatedMessages);

    let student = null;
    try {
      const stored = localStorage.getItem("shauri_student");
      if (stored) student = JSON.parse(stored);
    } catch {
      student = null;
    }

    const historyToSend = updatedMessages
      .slice(1)
      .slice(0, -1)
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "teacher",
          message: userContent.trim(),
          history: historyToSend,
          student,
          uploadedText: uploadedText ?? null,
        }),
      });

      const data = await res.json();

      const aiMessage: Message = {
        role: "assistant",
        content:
          typeof data?.reply === "string"
            ? data.reply
            : "Something went wrong. Please try again.",
      };

      setMessages([...updatedMessages, aiMessage]);
    } catch {
      setMessages([
        ...updatedMessages,
        {
          role: "assistant",
          content: "Network error. Please check your connection and try again.",
        },
      ]);
    }
  }

  return (
    <div style={{ minHeight: "100vh", paddingTop: 24, paddingBottom: 140 }}>
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
          ← Modes
        </button>
      </div>

      <h1 style={{ textAlign: "center", marginBottom: 16 }}>
        Teacher Mode
      </h1>

      <ChatUI messages={messages} />

      {/* ✅ Fixed input, page scroll stays clean */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          width: "100%",
          background: "#f8fafc",
          padding: "12px 0",
          borderTop: "1px solid #e2e8f0",
        }}
      >
        <ChatInput onSend={handleSend} />
      </div>
    </div>
  );
}