"use client";

import { useState } from "react";
import ChatShell from "../components/ChatShell";
import ChatUI, { ChatMessage } from "../components/ChatUI";
import ChatInput from "../components/ChatInput";

export default function ExaminerPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Welcome to Examiner Mode 📘 Ask a question or start a practice test.",
    },
  ]);

  return (
    <ChatShell
      title="Examiner Mode"
      subtitle="Practice questions & evaluation"
    >
      <ChatUI messages={messages} />
      <ChatInput
        onSend={(msg) =>
          setMessages((m) => [...m, { role: "user", content: msg }])
        }
      />
    </ChatShell>
  );
}
