"use client";

type Message = {
  role: "user" | "assistant";
  content: string;
};

function splitUploadedContent(content: string) {
  const uploadMarker = "[UPLOADED STUDY MATERIAL / ANSWER SHEET]";
  if (!content.includes(uploadMarker)) {
    return { uploaded: null, text: content };
  }

  const parts = content.split(uploadMarker);
  return {
    uploaded: parts[1]?.trim() ?? null,
    text: parts[0]?.trim() ?? "",
  };
}

export default function ChatUI({ messages }: { messages: Message[] }) {
  return (
    <div
      style={{
        maxWidth: "720px",
        margin: "0 auto",
        paddingBottom: "120px",
        paddingTop: "24px",
      }}
    >
      {messages.map((m, i) => {
        const { uploaded, text } = splitUploadedContent(m.content);

        return (
          <div
            key={i}
            style={{
              marginBottom: "16px",
              display: "flex",
              justifyContent:
                m.role === "user" ? "flex-end" : "flex-start",
            }}
          >
            <div
              style={{
                background:
                  m.role === "user" ? "#38bdf8" : "#f1f5f9",
                color:
                  m.role === "user" ? "white" : "#0f172a",
                padding: "14px 18px",
                borderRadius: "16px",
                maxWidth: "85%",
                fontSize: "15px",
                lineHeight: "1.6",
                whiteSpace: "pre-wrap",
              }}
            >
              {uploaded && (
                <div
                  style={{
                    fontSize: "13px",
                    marginBottom: "8px",
                    opacity: 0.85,
                  }}
                >
                  📎 Uploaded file included
                </div>
              )}

              {text || m.content}
            </div>
          </div>
        );
      })}
    </div>
  );
}
