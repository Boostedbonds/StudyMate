"use client";

import { useRef, useState } from "react";

type Props = {
  onSend: (message: string, uploadedText?: string) => void;
};

export default function ChatInput({ onSend }: Props) {
  const [value, setValue] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [uploadedText, setUploadedText] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function handleSend() {
    const trimmed = value.trim();

    if (!trimmed && !uploadedText) return;

    onSend(trimmed, uploadedText ?? undefined);

    setValue("");
    setUploadedText(null);
    setFileName(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);

    /**
     * STUB EXTRACTION (build-safe)
     * Real PDF / Image OCR can be plugged later
     */
    if (file.type === "application/pdf") {
      setUploadedText(
        `Student uploaded a PDF file named "${file.name}". Treat this as provided study material or answer sheet.`
      );
      return;
    }

    if (file.type.startsWith("image/")) {
      setUploadedText(
        `Student uploaded an image file named "${file.name}". Treat this as provided study material or answer sheet.`
      );
      return;
    }

    setUploadedText(
      `Student uploaded a file named "${file.name}". Treat this as provided content.`
    );
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
          flexDirection: "column",
          gap: "8px",
        }}
      >
        {fileName && (
          <div
            style={{
              fontSize: "13px",
              color: "#475569",
              paddingLeft: "6px",
            }}
          >
            📎 {fileName}
          </div>
        )}

        <div
          style={{
            display: "flex",
            gap: "12px",
            alignItems: "flex-end",
          }}
        >
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Ask StudyMate anything…"
            rows={2}
            style={{
              flex: 1,
              resize: "none",
              border: "none",
              outline: "none",
              fontSize: "16px",
              lineHeight: "1.5",
              padding: "12px",
              borderRadius: "12px",
              background: "#f8fafc",
              minHeight: "52px",
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />

          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,image/png,image/jpeg"
            onChange={handleFileChange}
            style={{ display: "none" }}
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={{
              background: "#e2e8f0",
              border: "none",
              borderRadius: "12px",
              padding: "10px 12px",
              fontSize: "18px",
              cursor: "pointer",
            }}
            title="Upload PDF or Image"
          >
            📎
          </button>

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
    </div>
  );
}
