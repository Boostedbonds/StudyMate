"use client";

import { useState } from "react";
import ChatShell from "../components/ChatShell";
import ChatUI, { ChatMessage } from "../components/ChatUI";
import ChatInput from "../components/ChatInput";

export default function OralPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Oral Practice Mode 🎤 Answer verbally or type your response.",
    },
  ]);

  return (
    <ChatShell
      title="Oral Practice"
      subtitle="Speak or type your answers"
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
