"use client";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export default function ChatUI({ messages }: { messages: ChatMessage[] }) {
  return (
    <div className="space-y-4">
      {messages.map((m, i) => (
        <div
          key={i}
          className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            m.role === "user"
              ? "ml-auto bg-sky-500 text-white"
              : "bg-slate-100 text-slate-800"
          }`}
        >
          {m.content}
        </div>
      ))}
    </div>
  );
}
