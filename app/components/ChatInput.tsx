"use client";

import React, { useEffect, useRef, useState } from "react";

type ChatInputProps = {
  onSend: (text: string) => void;
};

export default function ChatInput({ onSend }: ChatInputProps) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    autoResize();
  }, [text]);

  const autoResize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`; // NO LIMIT
  };

  const handleSend = () => {
    if (!text.trim()) return;
    onSend(text.trim());
    setText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="w-full flex justify-center px-4 py-4 border-t bg-white">
      <div className="w-full max-w-3xl flex items-end gap-2">
        <button
          type="button"
          aria-label="Attach"
          className="h-12 w-12 rounded-full border border-gray-300 hover:bg-gray-100"
        >
          +
        </button>

        <button
          type="button"
          aria-label="Voice"
          className="h-12 w-12 rounded-full border border-gray-300 hover:bg-gray-100"
        >
          🎤
        </button>

        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your question or answer…"
          className="flex-1 resize-none overflow-hidden rounded-2xl border border-gray-300 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={1}
        />

        <button
          type="button"
          onClick={handleSend}
          className="h-12 px-6 rounded-2xl bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
          disabled={!text.trim()}
        >
          Send
        </button>
      </div>
    </div>
  );
}
