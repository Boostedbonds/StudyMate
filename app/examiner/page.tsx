"use client";

import { useState } from "react";
import ChatUI from "../components/ChatUI";
import ChatInput from "../components/ChatInput";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function ExaminerPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Examiner Mode 📘 Type START or YES to begin the exam.",
    },
  ]);

  async function handleSend(text: string, uploadedText?: string) {
    if (!text.trim() && !uploadedText) return;

    let userContent = "";

    // 🔒 Uploaded files are valid answer sheets
    if (uploadedText) {
      userContent += `
[UPLOADED STUDY MATERIAL / ANSWER SHEET]
${uploadedText}
`;
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

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "examiner", // 🔒 CRITICAL: enforce Examiner rules
        messages: updatedMessages,
        uploadedText: uploadedText ?? null,
      }),
    });

    const data = await res.json();

    const aiMessage: Message = {
      role: "assistant",
      content:
        typeof data?.reply === "string"
          ? data.reply
          : "",
    };

    /**
     * 🔒 SILENT EXAM MODE SAFETY
     * If examiner returns empty or non-text during silent phase,
     * we still append safely without breaking UI.
     */
    if (aiMessage.content) {
      setMessages([...updatedMessages, aiMessage]);
    } else {
      setMessages(updatedMessages);
    }
  }

  return (
    <div style={{ minHeight: "100vh", paddingTop: 24 }}>
      {/* 🔙 Back Button — locked base UI style */}
      <div style={{ paddingLeft: 24, marginBottom: 16 }}>
        <button
          onClick={() => (window.location.href = "/")}
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

      <h1 style={{ textAlign: "center", marginBottom: 16 }}>
        Examiner Mode
      </h1>

      <ChatUI messages={messages} />
      <ChatInput onSend={handleSend} />
    </div>
  );
}
