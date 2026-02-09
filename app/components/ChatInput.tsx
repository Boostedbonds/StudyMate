"use client";

import { useState } from "react";

export default function ChatInput({
  onSend,
}: {
  onSend: (msg: string) => void;
}) {
  const [text, setText] = useState("");

  return (
    <div className="mt-6 flex justify-center">
      <div className="flex w-full max-w-3xl items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-lg">
        <textarea
          className="flex-1 resize-none rounded-xl border border-slate-200 p-3 text-base focus:outline-none focus:ring-2 focus:ring-sky-400"
          placeholder="Type your message..."
          rows={2}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (text.trim()) {
                onSend(text);
                setText("");
              }
            }
          }}
        />

        <button
          onClick={() => {
            if (text.trim()) {
              onSend(text);
              setText("");
            }
          }}
          className="rounded-xl bg-sky-500 px-5 py-3 text-white text-sm font-medium hover:bg-sky-600"
        >
          Send
        </button>
      </div>
    </div>
  );
}
