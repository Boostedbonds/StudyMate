"use client";

import { useState } from "react";

type Props = {
  onSend: (message: string) => void;
};

export default function ChatInput({ onSend }: Props) {
  const [value, setValue] = useState("");

  function handleSend() {
    if (!value.trim()) return;
    onSend(value.trim());
    setValue("");
  }

  return (
    <div
      style={{
        position: "fixed",
        bottom: "24px",
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        zIndex: 50,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "720px",
          background: "white",
          borderRadius: "18px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
          padding: "12px",
          display: "flex",
          gap: "12px",
          alignItems: "flex-end",
        }}
      >
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Ask StudyMate anything…"
          rows={1}
          style={{
            flex: 1,
            resize: "none",
            border: "none",
            outline: "none",
            fontSize: "16px",
            lineHeight: "1.5",
            padding: "10px 12px",
            borderRadius: "12px",
            background: "#f8fafc",
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />

        <button
          onClick={handleSend}
          style={{
            background: "#38bdf8",
            color: "white",
            border: "none",
            borderRadius: "12px",
            padding: "10px 18px",
            fontSize: "15px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
