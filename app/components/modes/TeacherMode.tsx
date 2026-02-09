"use client";

import { useState } from "react";

type Msg = {
  role: "user" | "assistant";
  content: string;
};

type TeacherModeProps = {
  onBack: () => void;
};

export default function TeacherMode({ onBack }: TeacherModeProps) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function send() {
    if (!input.trim()) return;

    const userMsg: Msg = { role: "user", content: input.trim() };
    const nextMessages = [...messages, userMsg];

    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "teacher",
          messages: nextMessages,
        }),
      });

      const data = await res.json();

      if (data?.reply) {
        setMessages((m) => [
          ...m,
          { role: "assistant", content: data.reply },
        ]);
      } else {
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            content: "I couldn’t generate a response. Please try again.",
          },
        ]);
      }
    } catch {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: "Something went wrong. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="screen">
      <div className="card stack">
        {/* 🔙 Back Button — locked base UI style */}
        <div style={{ marginBottom: 12 }}>
          <button
            onClick={onBack}
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

        <h2>Teacher Mode</h2>

        <div style={{ maxHeight: 300, overflowY: "auto" }}>
          {messages.map((m, i) => (
            <div key={i}>
              <b>{m.role === "user" ? "You:" : "Teacher:"}</b>
              <p>{m.content}</p>
            </div>
          ))}
        </div>

        <textarea
          placeholder="Ask a question"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={3}
        />

        <button onClick={send} disabled={loading}>
          {loading ? "Thinking..." : "Ask"}
        </button>
      </div>
    </div>
  );
}
