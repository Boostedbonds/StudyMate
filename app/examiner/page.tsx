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
    { role: "assistant", content: "Examiner Mode 📘 Ready for practice questions?" },
  ]);

  async function handleSend(text: string) {
    const userMessage: Message = { role: "user", content: text };
    const updatedMessages: Message[] = [...messages, userMessage];
    setMessages(updatedMessages);

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: updatedMessages }),
    });

    const data = await res.json();

    const aiMessage: Message = {
      role: "assistant",
      content: data.reply,
    };

    setMessages([...updatedMessages, aiMessage]);
  }

  return (
    <div style={{ minHeight: "100vh", paddingTop: 32 }}>
      <h1 style={{ textAlign: "center" }}>Examiner Mode</h1>
      <ChatUI messages={messages} />
      <ChatInput onSend={handleSend} />
    </div>
  );
}
