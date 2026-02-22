"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ChatUI from "../components/ChatUI";
import ChatInput from "../components/ChatInput";

export type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function TeacherPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hi there, we’ll go step by step. What would you like to study today?",
    },
  ]);

  const [loading, setLoading] = useState(false);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function handleSend(text: string, uploadedText?: string) {
    if (!text.trim() && !uploadedText) return;

    let userContent = "";

    if (uploadedText) {
      userContent += `
[UPLOADED STUDY MATERIAL]
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

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setLoading(true);

    let student = null;
    try {
      const stored = localStorage.getItem("shauri_student");
      if (stored) student = JSON.parse(stored);
    } catch {}

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "teacher",
        messages: updatedMessages,
        student,
      }),
    });

    const data = await res.json();

    const aiMessage: Message = {
      role: "assistant",
      content:
        typeof data?.reply === "string"
          ? data.reply
          : "Something went wrong.",
    };

    setLoading(false);
    setMessages([...updatedMessages, aiMessage]);
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "linear-gradient(to bottom, #f8fafc, #eef2f7)",
      }}
    >
      {/* 🔙 Back */}
      <div style={{ padding: 24 }}>
        <button
          onClick={() => (window.location.href = "/modes")}
          style={{
            padding: "10px 16px",
            background: "#2563eb",
            color: "#fff",
            borderRadius: 12,
            border: "none",
            cursor: "pointer",
          }}
        >
          ← Modes
        </button>
      </div>

      <h1 style={{ textAlign: "center", marginBottom: 20 }}>
        Teacher Mode
      </h1>

      {/* 💬 Chat */}
      <div style={{ flex: 1, padding: "0 16px 140px 16px" }}>
        <AnimatePresence>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <ChatUI messages={[msg]} />
            </motion.div>
          ))}
        </AnimatePresence>

        {/* 🤖 Typing Indicator */}
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              marginTop: 10,
              fontSize: 13,
              color: "#666",
              paddingLeft: 10,
            }}
          >
            Shauri is thinking...
          </motion.div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ⌨️ Input (GLASS STYLE) */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          width: "100%",
          backdropFilter: "blur(10px)",
          background: "rgba(255,255,255,0.75)",
          borderTop: "1px solid rgba(0,0,0,0.08)",
          padding: "12px 16px",
        }}
      >
        <ChatInput onSend={handleSend} />
      </div>
    </div>
  );
}