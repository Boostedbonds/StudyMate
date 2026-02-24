"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  onSend: (message: string, uploadedText?: string, uploadType?: "syllabus" | "answer") => void;
  examStarted?: boolean; // ← tells ChatInput whether exam is live
};

declare global {
  interface Window {
    webkitSpeechRecognition?: any;
    SpeechRecognition?: any;
  }
}

// ─────────────────────────────────────────────────────────────
// PDF TEXT EXTRACTION
// Uses pdfjs-dist (already available in most Next.js projects).
// Falls back gracefully if the lib isn't present.
// ─────────────────────────────────────────────────────────────
async function extractPdfText(file: File): Promise<string> {
  try {
    // Dynamic import so the heavy PDF lib is only loaded when needed
    const pdfjsLib = await import("pdfjs-dist");

    // Required: point the worker at the correct URL
    // If you're using Next.js, copy the worker to /public or use a CDN
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    const pages: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item: any) => item.str)
        .join(" ");
      pages.push(pageText);
    }

    const fullText = pages.join("\n\n").trim();
    return fullText.length > 20
      ? fullText
      : ""; // return empty if extraction produced nothing useful
  } catch {
    // pdfjs not installed or extraction failed — return empty so
    // caller can show a friendly message instead of fake content
    return "";
  }
}

// ─────────────────────────────────────────────────────────────
// IMAGE → BASE64
// Converts an image file to base64 string for server-side OCR.
// The server (route.ts / a dedicated /api/ocr endpoint) receives
// this and can pass it to Gemini's vision API for real extraction.
// ─────────────────────────────────────────────────────────────
async function imageToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string); // data:image/...;base64,...
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
    // Convert to base64 — route.ts / Gemini vision will do real OCR
    const base64 = await imageToBase64(file);
    // Wrap in a clear marker so route.ts knows this is a base64 image
    return {
      text: `[IMAGE_BASE64]\n${base64}`,
      isImage: true,
    };
  }

  return { text: "", isImage: false };
}

export default function ChatInput({ onSend, examStarted = false }: Props) {
  const [value, setValue]             = useState("");
  const [fileNames, setFileNames]     = useState<string[]>([]);
  const [uploadedText, setUploadedText] = useState<string | null>(null);
  const [uploadType, setUploadType]   = useState<"syllabus" | "answer">("syllabus");
  const [processing, setProcessing]   = useState(false); // ← shows while extracting PDF
  const [listening, setListening]     = useState(false);

  const fileInputRef  = useRef<HTMLInputElement | null>(null);
  const textareaRef   = useRef<HTMLTextAreaElement | null>(null);
  const recognitionRef = useRef<any>(null);

  /* ── Mic setup ───────────────────────────────────────────── */
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((r: any) => r[0].transcript)
        .join(" ");
      setValue((prev) => (prev ? `${prev} ${transcript}` : transcript));
    };

    recognition.onend  = () => setListening(false);
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

    // ── Determine upload type from exam state ─────────────────
    // examStarted prop is the source of truth — no guessing from status
    const type: "syllabus" | "answer" = examStarted ? "answer" : "syllabus";
    setUploadType(type);

    const results = await Promise.all(files.map(processFile));
    const combined = results
      .map((r, i) => {
        if (!r.text) {
          // Extraction failed — tell the server honestly
          const fileType = files[i].type.startsWith("image/") ? "image" : "PDF";
          return `[UNREADABLE_${fileType.toUpperCase()}]\nFile: ${files[i].name}\nNote: Text could not be extracted. Please type your answer manually.`;
        }
        return r.text;
      })
      .join("\n\n---\n\n");

    setUploadedText(combined);
    setProcessing(false);
  }

  /* ── Send ────────────────────────────────────────────────── */
  function handleSend() {
    const trimmed = value.trim();
    if (!trimmed && !uploadedText) return;
    if (processing) return; // don't send while still extracting

    onSend(trimmed, uploadedText ?? undefined, uploadedText ? uploadType : undefined);

    setValue("");
    clearAttachment();
    textareaRef.current?.blur();
  }

  /* ── Upload label shown in the attachment preview ───────── */
  const uploadLabel = uploadType === "syllabus"
    ? "📋 Syllabus upload"
    : "📝 Answer upload";

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
        }}
      >
        {/* ── Processing indicator ── */}
        {processing && (
          <div style={{ fontSize: 13, color: "#2563eb", paddingLeft: 6 }}>
            ⏳ Extracting content from file…
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
            {/* Upload type badge */}
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

            {/* Warn if extraction failed */}
            {uploadedText?.includes("[UNREADABLE_") && (
              <div style={{ fontSize: 12, color: "#ea580c", marginTop: 2 }}>
                ⚠️ Could not extract text from this file. You can still send it — type your answer manually too.
              </div>
            )}

            <button
              onClick={clearAttachment}
              style={{
                border: "none",
                background: "transparent",
                cursor: "pointer",
                fontSize: 14,
                color: "#ef4444",
                alignSelf: "flex-start",
                padding: 0,
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
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: "#e2e8f0",
              border: "none",
              fontSize: 22,
              cursor: "pointer",
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
            title={listening ? "Stop listening" : "Start speaking"}
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              border: "none",
              background: listening ? "#dc2626" : "#e5e7eb",
              color: listening ? "#ffffff" : "#0f172a",
              fontSize: 18,
              cursor: "pointer",
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
            placeholder="Type or speak…"
            rows={1}
            style={{
              flex: 1,
              resize: "none",
              border: "none",
              outline: "none",
              fontSize: 16,
              lineHeight: "1.5",
              padding: "12px 14px",
              borderRadius: 12,
              background: "#f8fafc",
              minHeight: 44,
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />

          {/* ➤ Send */}
          <button
            onClick={handleSend}
            disabled={processing}
            style={{
              background: processing ? "#94a3b8" : "#38bdf8",
              color: "white",
              border: "none",
              borderRadius: 12,
              padding: "10px 18px",
              fontSize: 15,
              fontWeight: 600,
              cursor: processing ? "not-allowed" : "pointer",
              flexShrink: 0,
            }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}