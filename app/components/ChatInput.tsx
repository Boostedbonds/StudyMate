"use client";
import { useEffect, useRef, useState } from "react";

type Props = {
  onSend: (message: string, uploadedText?: string, uploadType?: "syllabus" | "answer") => void;
  examStarted?: boolean;
  disabled?: boolean;
  inline?: boolean; // when true: renders as block element, no fixed positioning
};

declare global {
  interface Window {
    webkitSpeechRecognition?: any;
    SpeechRecognition?: any;
  }
}

async function extractPdfText(file: File): Promise<string> {
  try {
    const pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const pages: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      pages.push(content.items.map((item: any) => item.str).join(" "));
    }
    const full = pages.join("\n\n").trim();
    return full.length > 20 ? full : "";
  } catch { return ""; }
}

async function imageToBase64(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

async function processFile(file: File): Promise<{ text: string }> {
  if (file.type === "application/pdf") return { text: await extractPdfText(file) };
  if (file.type.startsWith("image/")) return { text: `[IMAGE_BASE64]\n${await imageToBase64(file)}` };
  return { text: "" };
}

export default function ChatInput({ onSend, examStarted = false, disabled = false, inline = false }: Props) {
  const [value, setValue]               = useState("");
  const [fileNames, setFileNames]       = useState<string[]>([]);
  const [uploadedText, setUploadedText] = useState<string | null>(null);
  const [uploadType, setUploadType]     = useState<"syllabus" | "answer">("syllabus");
  const [processing, setProcessing]     = useState(false);
  const [listening, setListening]       = useState(false);

  const fileInputRef   = useRef<HTMLInputElement | null>(null);
  const textareaRef    = useRef<HTMLTextAreaElement | null>(null);
  const recognitionRef = useRef<any>(null);

  const isBlocked = disabled || processing;

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR();
    r.lang = "en-IN"; r.interimResults = false; r.continuous = false;
    r.onresult = (e: any) => {
      const t = Array.from(e.results).map((r: any) => r[0].transcript).join(" ");
      setValue(prev => prev ? `${prev} ${t}` : t);
    };
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    recognitionRef.current = r;
  }, []);

  function toggleMic() {
    if (!recognitionRef.current) { alert("Mic not supported. Use Chrome."); return; }
    if (listening) { recognitionRef.current.stop(); setListening(false); }
    else { recognitionRef.current.start(); setListening(true); }
  }

  function clearAttachment() {
    setFileNames([]); setUploadedText(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setProcessing(true);
    setFileNames(files.map(f => f.name));
    setUploadType(examStarted ? "answer" : "syllabus");
    const results = await Promise.all(files.map(processFile));
    const combined = results.map((r, i) =>
      r.text || `[UNREADABLE]\nFile: ${files[i].name}`
    ).join("\n\n---\n\n");
    setUploadedText(combined);
    setProcessing(false);
  }

  function handleSend() {
    if (isBlocked) return;
    const trimmed = value.trim();
    if (!trimmed && !uploadedText) return;
    onSend(trimmed, uploadedText ?? undefined, uploadedText ? uploadType : undefined);
    setValue(""); clearAttachment();
    textareaRef.current?.blur();
  }

  const inner = (
    <div style={{
      background: "white", borderRadius: 18,
      boxShadow: inline ? "0 2px 12px rgba(0,0,0,0.08)" : "0 8px 30px rgba(0,0,0,0.12)",
      border: inline ? "1px solid #e2e8f0" : "none",
      padding: "10px 12px",
      display: "flex", flexDirection: "column", gap: 6,
      opacity: disabled ? 0.65 : 1, transition: "opacity 0.2s",
    }}>
      {processing && <div style={{ fontSize: 13, color: "#2563eb", paddingLeft: 4 }}>⏳ Extracting file…</div>}
      {disabled && !processing && <div style={{ fontSize: 13, color: "#64748b", paddingLeft: 4 }}>⏳ Waiting for response…</div>}

      {fileNames.length > 0 && !processing && (
        <div style={{ fontSize: 13, color: "#475569", paddingLeft: 4, display: "flex", flexDirection: "column", gap: 3 }}>
          <span style={{
            display: "inline-block", padding: "2px 10px", borderRadius: 50,
            background: uploadType === "syllabus" ? "#eff6ff" : "#f0fdf4",
            color: uploadType === "syllabus" ? "#2563eb" : "#059669",
            fontSize: 11, fontWeight: 700, alignSelf: "flex-start", marginBottom: 2,
          }}>
            {uploadType === "syllabus" ? "📋 Syllabus" : "📝 Answer"}
          </span>
          {fileNames.map((n, i) => <div key={i}>📎 {n}</div>)}
          <button onClick={clearAttachment} disabled={isBlocked} style={{
            border: "none", background: "transparent", cursor: "pointer",
            fontSize: 13, color: "#ef4444", alignSelf: "flex-start", padding: 0,
          }}>✕ Remove</button>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input ref={fileInputRef} type="file" multiple
          accept="application/pdf,image/png,image/jpeg,image/jpg,image/webp"
          onChange={handleFileChange} style={{ display: "none" }} disabled={isBlocked} />

        <button type="button" onClick={() => !isBlocked && fileInputRef.current?.click()}
          disabled={isBlocked} title="Attach file"
          style={{
            width: 40, height: 40, borderRadius: 10, fontSize: 22, border: "none",
            background: isBlocked ? "#f1f5f9" : "#e2e8f0",
            cursor: isBlocked ? "not-allowed" : "pointer", flexShrink: 0,
          }}>+</button>

        <button type="button" onClick={toggleMic} disabled={isBlocked}
          title={listening ? "Stop mic" : "Start mic"}
          style={{
            width: 40, height: 40, borderRadius: "50%", border: "none",
            background: listening ? "#dc2626" : "#e5e7eb",
            color: listening ? "#fff" : "#0f172a", fontSize: 17,
            cursor: isBlocked ? "not-allowed" : "pointer", flexShrink: 0,
          }}>
          {listening ? "■" : "🎤"}
        </button>

        <textarea ref={textareaRef} value={value}
          onChange={e => setValue(e.target.value)}
          placeholder={disabled ? "Waiting…" : "Type or speak…"}
          rows={1} disabled={isBlocked}
          style={{
            flex: 1, resize: "none", border: "none", outline: "none",
            fontSize: 16, lineHeight: "1.5", padding: "10px 12px",
            borderRadius: 12, background: isBlocked ? "#f1f5f9" : "#f8fafc",
            minHeight: 44, cursor: isBlocked ? "not-allowed" : "text",
          }}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
        />

        <button onClick={handleSend} disabled={isBlocked}
          style={{
            background: isBlocked ? "#94a3b8" : "#38bdf8", color: "white",
            border: "none", borderRadius: 12, padding: "10px 20px",
            fontSize: 15, fontWeight: 700,
            cursor: isBlocked ? "not-allowed" : "pointer", flexShrink: 0,
          }}>Send</button>
      </div>
    </div>
  );

  // inline = inside examiner split (no fixed)
  if (inline) return <div style={{ width: "100%" }}>{inner}</div>;

  // default = fixed bottom, full width (teacher, oral, practice, etc.)
  return (
    <div style={{ position: "fixed", bottom: 24, left: 0, right: 0, display: "flex", justifyContent: "center", zIndex: 50, padding: "0 16px" }}>
      <div style={{ width: "100%", maxWidth: 740 }}>{inner}</div>
    </div>
  );
}