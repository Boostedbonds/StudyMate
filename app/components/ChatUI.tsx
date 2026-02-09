"use client";

import React, { useEffect, useRef } from "react";
import SaveNoteButton from "./SaveNoteButton";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type ChatUIProps = {
  messages: ChatMessage[];
};

export default function ChatUI({ messages }: ChatUIProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="w-full flex justify-center px-4">
      <div className="w-full max-w-3xl space-y-6">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`rounded-2xl px-5 py-4 leading-relaxed ${
              msg.role === "user"
                ? "bg-blue-600 text-white self-end"
                : "bg-white border border-gray-200 text-gray-900"
            }`}
          >
            <div className="whitespace-pre-wrap text-base">
              {msg.content}
            </div>

            {msg.role === "assistant" && (
              <div className="mt-3 flex justify-end">
                <SaveNoteButton content={msg.content} />
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
