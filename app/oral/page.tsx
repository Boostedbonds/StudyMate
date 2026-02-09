"use client";

import { useState } from "react";
import ChatUI from "../components/ChatUI";
import ChatInput from "../components/ChatInput";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function OralPage() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Oral Mode 🎤 Speak or type your answer." },
  ]);

  async function handleSend(text: string) {
    if (!text.trim()) return;

    const userMessage: Message = { role: "user", content: text };
    const updatedMessages: Message[] = [...messages, userMessage];
    setMessages(updatedMessages);

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "oral", // 🔒 CRITICAL: enforce Oral Mode rules
        messages: updatedMessages,
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
        Oral Mode
      </h1>

      <ChatUI messages={messages} />
      <ChatInput onSend={handleSend} />
    </div>
  );
}
