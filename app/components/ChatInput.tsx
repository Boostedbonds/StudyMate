"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  onSend: (message: string, uploadedText?: string, uploadType?: "syllabus" | "answer") => void;
  examStarted?: boolean;
  disabled?: boolean; // ← blocks all input while a request is in-flight
};

declare global {
  interface Window {
    webkitSpeechRecognition?: any;
    SpeechRecognition?: any;
  }
}

// ─────────────────────────────────────────────────────────────
// PDF TEXT EXTRACTION
// ─────────────────────────────────────────────────────────────
async function extractPdfText(file: File): Promise<string> {
  try {
    const pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    const pages: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page    = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map((item: any) => item.str).join(" ");
      pages.push(pageText);
    }

    const fullText = pages.join("\n\n").trim();
    return fullText.length > 20 ? fullText : "";
  } catch {
    return "";
  }
}

// ─────────────────────────────────────────────────────────────
// IMAGE → BASE64
// ─────────────────────────────────────────────────────────────
async function imageToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader  = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ─────────────────────────────────────────────────────────────
// PROCESS A SINGLE FILE → return extracted text
// ─────────────────────────────────────────────────────────────
async function processFile(file: File): Promise<{ text: string; isImage: boolean }> {
  if (file.type === "application/pdf") {
    const text = await extractPdfText(file);
    return { text, isImage: false };
  }
  if (file.type.startsWith("image/")) {
    const base64 = await imageToBase64(file);
    return { text: `[IMAGE_BASE64]\n${base64}`, isImage: true };
  }
  return { text: "", isImage: false };
}

export default function ChatInput({
  onSend,
  examStarted = false,
  disabled    = false,
}: Props) {
  const [value, setValue]               = useState("");
  const [fileNames, setFileNames]       = useState<string[]>([]);
  const [uploadedText, setUploadedText] = useState<string | null>(null);
  const [uploadType, setUploadType]     = useState<"syllabus" | "answer">("syllabus");
  const [processing, setProcessing]     = useState(false);
  const [listening, setListening]       = useState(false);

  const fileInputRef   = useRef<HTMLInputElement | null>(null);
  const textareaRef    = useRef<HTMLTextAreaElement | null>(null);
  const recognitionRef = useRef<any>(null);

  // Combined "blocked" flag — true while loading OR while extracting a file
  const isBlocked = disabled || processing;

  /* ── Mic setup ───────────────────────────────────────────── */
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition        = new SpeechRecognition();
    recognition.lang         = "en-IN";
    recognition.interimResults = false;
    recognition.continuous   = false;

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((r: any) => r[0].transcript)
        .join(" ");
      setValue((prev) => (prev ? `${prev} ${transcript}` : transcript));
    };
    recognition.onend   = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognitionRef.current = recognition;
  }, []);

  function toggleMic() {
    if (!recognitionRef.current) {
      alert("Microphone is not supported in this browser.");
      return;
    }
    if (listening) {
      recognitionRef.current.stop();
      setListening(false);
    } else {
      recognitionRef.current.start();
      setListening(true);
    }
  }

  /* ── File handling ───────────────────────────────────────── */
  function clearAttachment() {
    setFileNames([]);
    setUploadedText(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setProcessing(true);
    setFileNames(files.map((f) => f.name));

    const type: "syllabus" | "answer" = examStarted ? "answer" : "syllabus";
    setUploadType(type);

    const results = await Promise.all(files.map(processFile));
    const combined = results
      .map((r, i) => {
        if (!r.text) {
          const fileType = files[i].type.startsWith("image/") ? "IMAGE" : "PDF";
          return `[UNREADABLE_${fileType}]\nFile: ${files[i].name}\nNote: Text could not be extracted. Please type your answer manually.`;
        }
        return r.text;
      })
      .join("\n\n---\n\n");

    setUploadedText(combined);
    setProcessing(false);
  }

  /* ── Send ────────────────────────────────────────────────── */
  function handleSend() {
    if (isBlocked) return;                        // ← hard block: loading OR extracting
    const trimmed = value.trim();
    if (!trimmed && !uploadedText) return;

    onSend(trimmed, uploadedText ?? undefined, uploadedText ? uploadType : undefined);

    setValue("");
    clearAttachment();
    textareaRef.current?.blur();
  }

  const uploadLabel = uploadType === "syllabus" ? "📋 Syllabus upload" : "📝 Answer upload";

  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
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
          maxWidth: 720,
          background: "white",
          borderRadius: 18,
          boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
          padding: 12,
          display: "flex",
          flexDirection: "column",
          gap: 6,
          // Visual dimming while blocked so student knows to wait
          opacity: disabled ? 0.6 : 1,
          transition: "opacity 0.2s",
        }}
      >
        {/* ── Processing indicator ── */}
        {processing && (
          <div style={{ fontSize: 13, color: "#2563eb", paddingLeft: 6 }}>
            ⏳ Extracting content from file…
          </div>
        )}

        {/* ── Loading indicator (request in-flight) ── */}
        {disabled && !processing && (
          <div style={{ fontSize: 13, color: "#64748b", paddingLeft: 6 }}>
            ⏳ Waiting for response…
          </div>
        )}

        {/* ── Attachment preview ── */}
        {fileNames.length > 0 && !processing && (
          <div
            style={{
              fontSize: 13,
              color: "#475569",
              display: "flex",
              flexDirection: "column",
              gap: 4,
              paddingLeft: 6,
            }}
          >
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              background: uploadType === "syllabus" ? "#eff6ff" : "#f0fdf4",
              color: uploadType === "syllabus" ? "#2563eb" : "#059669",
              fontSize: 11, fontWeight: 700,
              padding: "2px 10px", borderRadius: 50,
              alignSelf: "flex-start", marginBottom: 2,
            }}>
              {uploadLabel}
            </div>

            {fileNames.map((name, i) => (
              <div key={i}>📎 {name}</div>
            ))}

            {uploadedText?.includes("[UNREADABLE_") && (
              <div style={{ fontSize: 12, color: "#ea580c", marginTop: 2 }}>
                ⚠️ Could not extract text from this file. You can still send it — type your answer manually too.
              </div>
            )}

            <button
              onClick={clearAttachment}
              disabled={isBlocked}
              style={{
                border: "none", background: "transparent",
                cursor: isBlocked ? "not-allowed" : "pointer",
                fontSize: 14, color: "#ef4444",
                alignSelf: "flex-start", padding: 0,
              }}
              title="Remove attachments"
            >
              ✕ Remove
            </button>
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* ➕ Attachment */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="application/pdf,image/png,image/jpeg,image/jpg,image/webp"
            onChange={handleFileChange}
            style={{ display: "none" }}
            disabled={isBlocked}
          />
          <button
            type="button"
            onClick={() => !isBlocked && fileInputRef.current?.click()}
            disabled={isBlocked}
            style={{
              width: 40, height: 40,
              borderRadius: 10,
              background: isBlocked ? "#f1f5f9" : "#e2e8f0",
              border: "none", fontSize: 22,
              cursor: isBlocked ? "not-allowed" : "pointer",
              flexShrink: 0,
            }}
            title={examStarted ? "Upload answer (PDF or image)" : "Upload syllabus (PDF or image)"}
          >
            +
          </button>

          {/* 🎤 Mic */}
          <button
            type="button"
            onClick={toggleMic}
            disabled={isBlocked}
            title={listening ? "Stop listening" : "Start speaking"}
            style={{
              width: 40, height: 40,
              borderRadius: "50%",
              border: "none",
              background: listening ? "#dc2626" : "#e5e7eb",
              color: listening ? "#ffffff" : "#0f172a",
              fontSize: 18,
              cursor: isBlocked ? "not-allowed" : "pointer",
              flexShrink: 0,
            }}
          >
            {listening ? "■" : "🎤"}
          </button>

          {/* ✍️ Text input */}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={disabled ? "Waiting…" : "Type or speak…"}
            rows={1}
            disabled={isBlocked}
            style={{
              flex: 1,
              resize: "none",
              border: "none",
              outline: "none",
              fontSize: 16,
              lineHeight: "1.5",
              padding: "12px 14px",
              borderRadius: 12,
              background: isBlocked ? "#f1f5f9" : "#f8fafc",
              minHeight: 44,
              cursor: isBlocked ? "not-allowed" : "text",
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend(); // isBlocked check is inside handleSend
              }
            }}
          />

          {/* ➤ Send */}
          <button
            onClick={handleSend}
            disabled={isBlocked}
            style={{
              background: isBlocked ? "#94a3b8" : "#38bdf8",
              color: "white",
              border: "none",
              borderRadius: 12,
              padding: "10px 18px",
              fontSize: 15,
              fontWeight: 600,
              cursor: isBlocked ? "not-allowed" : "pointer",
              flexShrink: 0,
              transition: "background 0.2s",
            }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}