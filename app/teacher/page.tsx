"use client";

import { useState } from "react";
import ChatShell from "../components/ChatShell";
import ChatUI, { ChatMessage } from "../components/ChatUI";
import ChatInput from "../components/ChatInput";

export default function TeacherPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: "Hi 😊 What would you like to study today?" },
  ]);

  return (
    <ChatShell
      title="Teacher Mode"
      subtitle="NCERT-aligned concept learning"
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
