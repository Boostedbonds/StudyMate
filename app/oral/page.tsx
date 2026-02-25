"use client";
import { useEffect, useRef, useState } from "react";

type Message = { role: "user" | "assistant"; content: string };
type Lang = "auto" | "en-IN" | "hi-IN";
type Gender = "female" | "male";

function Waveform({ active, color = "#38bdf8" }: { active: boolean; color?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 3, height: 22 }}>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} style={{
          width: 3, borderRadius: 99, background: active ? color : "#e2e8f0",
          height: active ? undefined : 4,
          animation: active ? `wave ${0.5 + (i % 4) * 0.1}s ease-in-out ${i * 0.05}s infinite alternate` : "none",
          transition: "background 0.2s",
        }} />
      ))}
      <style>{`@keyframes wave { from { height: 3px; } to { height: 18px; } }`}</style>
    </div>
  );
}

async function speakViaAPI(
  text: string, gender: Gender, lang: Lang,
  onStart: () => void, onEnd: () => void,
  audioRef: React.MutableRefObject<HTMLAudioElement | null>
) {
  if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  const clean = text.replace(/\*\*/g, "").replace(/\*/g, "").replace(/#{1,6}\s/g, "")
    .replace(/━+|─+/g, "").replace(/[📋📝📎⏱✅⚠❌💪🎯📈📊🔤📚👋🎙📄⬇]/g, "").trim();
  if (!clean) return;
  onStart();
  try {
    const res = await fetch("/api/tts", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: clean, gender, lang: lang === "auto" ? "en-IN" : lang }),
    });
    if (!res.ok) throw new Error(`${res.status}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audioRef.current = audio;
    audio.onended = () => { URL.revokeObjectURL(url); audioRef.current = null; onEnd(); };
    audio.onerror = () => { URL.revokeObjectURL(url); audioRef.current = null; onEnd(); };
    audio.play();
  } catch {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(clean);
      u.lang = lang === "auto" ? "en-IN" : lang;
      u.rate = 0.93; u.pitch = gender === "female" ? 1.1 : 0.85;
      const voices = window.speechSynthesis.getVoices();
      const pick = voices.find(v => gender === "female"
        ? /female|woman|zira|samantha|veena|lekha/i.test(v.name)
        : /male|man|david|daniel/i.test(v.name)
      ) || voices.find(v => v.lang.startsWith("en"));
      if (pick) u.voice = pick;
      u.onend = onEnd; u.onerror = onEnd;
      window.speechSynthesis.speak(u);
    } else { onEnd(); }
  }
}

function renderText(text: string): React.ReactNode {
  return text.split("\n").map((line, i, arr) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g).map((p, j) =>
      p.startsWith("**") && p.endsWith("**") ? <strong key={j}>{p.slice(2, -2)}</strong> : p
    );
    return <span key={i}>{parts}{i < arr.length - 1 && <br />}</span>;
  });
}

export default function OralPage() {
  const GREETING = "Hello! I'm Shauri, your learning partner.\n\nTell me what you'd like to do — topic explanation, dictation, spelling practice, or a spoken quiz. I understand English, Hindi, and Hinglish.";

  const [messages, setMessages]     = useState<Message[]>([{ role: "assistant", content: GREETING }]);
  const [listening, setListening]   = useState(false);
  const [speaking, setSpeaking]     = useState(false);
  const [transcript, setTranscript] = useState("");
  const [inputText, setInputText]   = useState("");
  const [lang, setLang]             = useState<Lang>("auto");
  const [gender, setGender]         = useState<Gender>("female");
  const [isLoading, setIsLoading]   = useState(false);
  const [lastAI, setLastAI]         = useState(GREETING);
  // Mobile tab: "speak" (mic/preview) or "chat" (history)
  const [mobileTab, setMobileTab]   = useState<"speak" | "chat">("speak");

  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const spokenIndexRef = useRef(0);
  const audioRef       = useRef<HTMLAudioElement | null>(null);
  const greetingSpoken = useRef(false);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  useEffect(() => {
    if (greetingSpoken.current) return; greetingSpoken.current = true;
    setTimeout(() => speakViaAPI(GREETING, gender, lang, () => setSpeaking(true), () => setSpeaking(false), audioRef), 700);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const lastIdx = messages.length - 1;
    const last = messages[lastIdx];
    if (!last || last.role !== "assistant" || lastIdx <= spokenIndexRef.current) return;
    spokenIndexRef.current = lastIdx;
    setLastAI(last.content);
    // Switch to speak tab on mobile when AI responds
    setMobileTab("speak");
    speakViaAPI(last.content, gender, lang, () => setSpeaking(true), () => setSpeaking(false), audioRef);
  }, [messages, gender, lang]);

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR();
    r.continuous = true; r.interimResults = true;
    r.lang = lang === "auto" ? "en-IN" : lang;
    r.onresult = (e: any) => {
      let final = "", interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        e.results[i].isFinal ? (final += t) : (interim += t);
      }
      setTranscript(prev => prev + final || interim);
    };
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    recognitionRef.current = r;
  }, [lang]);

  function stopAudio() {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setSpeaking(false);
  }

  function toggleMic() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert("Speech not supported. Use Chrome."); return; }
    if (listening) {
      recognitionRef.current?.stop(); setListening(false);
      if (transcript.trim()) { handleSend(transcript.trim()); setTranscript(""); }
    } else {
      stopAudio(); setTranscript("");
      recognitionRef.current.lang = lang === "auto" ? "en-IN" : lang;
      recognitionRef.current.start(); setListening(true);
    }
  }

  async function handleSend(text: string) {
    if (!text.trim() || isLoading) return;
    const userMsg: Message = { role: "user", content: text.trim() };
    const updated = [...messages, userMsg];
    setMessages(updated); setInputText(""); setIsLoading(true);
    let student = null;
    try { student = JSON.parse(localStorage.getItem("shauri_student") || "null"); } catch {}
    const history = updated.slice(1, -1).map(m => ({ role: m.role, content: m.content }));
    try {
      const res = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "oral", message: text.trim(), history, student }),
      });
      const data = await res.json();
      const reply = typeof data?.reply === "string" ? data.reply : "Something went wrong.";
      setMessages([...updated, { role: "assistant", content: reply }]);
    } catch {
      setMessages([...updated, { role: "assistant", content: "⚠️ Network error. Please try again." }]);
    } finally { setIsLoading(false); }
  }

  function handleTextSend() {
    const t = inputText.trim() || transcript.trim();
    if (t) { handleSend(t); setInputText(""); setTranscript(""); }
  }

  const micBg = listening ? "#ef4444" : gender === "female" ? "#ec4899" : "#2563eb";

  // ── Chat history panel (shared between mobile tab and desktop left col) ──
  const ChatHistory = (
    <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: 10 }}>
      {messages.map((m, i) => {
        const isUser = m.role === "user";
        return (
          <div key={i} style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start" }}>
            <div
              onClick={() => {
                if (m.role === "assistant") {
                  setLastAI(m.content);
                  speakViaAPI(m.content, gender, lang, () => setSpeaking(true), () => setSpeaking(false), audioRef);
                }
              }}
              style={{
                maxWidth: "88%", padding: "11px 14px",
                borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                background: isUser ? "#38bdf8" : "#f1f5f9",
                color: isUser ? "#fff" : "#0f172a",
                fontSize: 15, lineHeight: 1.65,
                cursor: m.role === "assistant" ? "pointer" : "default",
                wordBreak: "break-word",
              }}
            >{renderText(m.content)}</div>
          </div>
        );
      })}
      {isLoading && (
        <div style={{ display: "flex", gap: 5, padding: "4px 8px" }}>
          {[0,1,2].map(i => (
            <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: "#38bdf8",
              animation: `bounce 1s ${i * 0.15}s infinite ease-in-out` }} />
          ))}
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );

  // ── Speak panel (preview + transcript + mic + input) ──
  const SpeakPanel = (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "12px", gap: 10, overflow: "hidden" }}>
      {/* AI response preview */}
      <div style={{
        flex: 1, background: "#fff",
        border: `1.5px solid ${speaking ? "#f9731650" : "#e2e8f0"}`,
        borderRadius: 14, padding: "14px 16px",
        overflowY: "auto", position: "relative",
        transition: "border-color 0.3s",
      }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "#94a3b8", marginBottom: 10,
          display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>AI RESPONSE</span>
          <div style={{ display: "flex", gap: 6 }}>
            {speaking ? (
              <button onClick={stopAudio} style={{ padding: "2px 10px", fontSize: 11, fontWeight: 700,
                background: "#fff7ed", color: "#f97316", border: "1px solid #fed7aa", borderRadius: 6, cursor: "pointer" }}>■ Stop</button>
            ) : (
              <button onClick={() => lastAI && speakViaAPI(lastAI, gender, lang, () => setSpeaking(true), () => setSpeaking(false), audioRef)}
                disabled={!lastAI} style={{ padding: "2px 10px", fontSize: 11, fontWeight: 700,
                  background: "#f8fafc", color: "#64748b", border: "1px solid #e2e8f0", borderRadius: 6,
                  cursor: lastAI ? "pointer" : "not-allowed" }}>▶ Replay</button>
            )}
          </div>
        </div>
        <div style={{ fontSize: 16, lineHeight: 1.8, color: speaking ? "#c2410c" : "#0f172a", transition: "color 0.3s", wordBreak: "break-word" }}>
          {lastAI ? renderText(lastAI) : <span style={{ color: "#94a3b8", fontStyle: "italic" }}>Shauri's response appears here…</span>}
        </div>
        {speaking && (
          <div style={{ position: "absolute", bottom: 10, right: 14, display: "flex", alignItems: "center", gap: 5 }}>
            <Waveform active color="#f97316" />
            <span style={{ fontSize: 11, color: "#f97316", fontWeight: 600 }}>Speaking</span>
          </div>
        )}
      </div>

      {/* Transcript */}
      <div style={{
        background: listening ? "#f0fdf4" : "#fff",
        border: `1.5px solid ${listening ? "#86efac" : "#e2e8f0"}`,
        borderRadius: 10, padding: "10px 14px", minHeight: 48, maxHeight: 80, overflowY: "auto",
        transition: "all 0.2s",
      }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: listening ? "#22c55e" : "#94a3b8", marginBottom: 4 }}>
          {listening ? "● LISTENING…" : "TRANSCRIPT"}
        </div>
        <div style={{ fontSize: 14, color: listening ? "#166534" : "#94a3b8", lineHeight: 1.4 }}>
          {transcript || <span style={{ fontStyle: "italic" }}>{listening ? "Speak now…" : "Speech appears here"}</span>}
        </div>
      </div>

      {/* Mic + input row */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <button onClick={toggleMic} style={{
          width: 60, height: 60, borderRadius: "50%", border: "none",
          background: micBg, color: "white", fontSize: 24,
          cursor: "pointer", flexShrink: 0,
          boxShadow: listening
            ? `0 0 0 8px ${micBg}30, 0 0 0 16px ${micBg}12`
            : `0 0 0 6px ${micBg}20, 0 4px 14px ${micBg}40`,
          transition: "all 0.25s",
          animation: listening ? "micPulse 1.5s infinite" : "none",
        }}>{listening ? "■" : "🎤"}</button>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Waveform active={listening} color={listening ? "#22c55e" : micBg} />
            <span style={{ fontSize: 12, fontWeight: 600, color: listening ? "#22c55e" : "#64748b" }}>
              {listening ? "Tap again to stop & send" : "Tap to speak"}
            </span>
          </div>
          <div style={{ display: "flex", gap: 7 }}>
            <textarea value={inputText} onChange={e => setInputText(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleTextSend(); } }}
              placeholder="Or type here…" rows={2}
              style={{ flex: 1, background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 10,
                color: "#0f172a", padding: "8px 12px", fontSize: 15, outline: "none", resize: "none", lineHeight: 1.4 }} />
            <button onClick={handleTextSend}
              disabled={isLoading || (!inputText.trim() && !transcript.trim())}
              style={{ padding: "8px 16px", alignSelf: "stretch",
                background: isLoading ? "#e2e8f0" : "#38bdf8",
                color: isLoading ? "#94a3b8" : "#fff", border: "none",
                borderRadius: 10, fontSize: 14, fontWeight: 700,
                cursor: isLoading ? "not-allowed" : "pointer" }}>Send</button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "#f8fafc", color: "#0f172a", overflow: "hidden" }}>
      <style>{`
        * { box-sizing: border-box; }
        @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
        @keyframes micPulse {
          0%,100%{box-shadow:0 0 0 8px rgba(0,0,0,0.08),0 0 0 16px rgba(0,0,0,0.04)}
          50%{box-shadow:0 0 0 12px rgba(0,0,0,0.1),0 0 0 22px rgba(0,0,0,0.03)}
        }
        /* Desktop: show both panels side by side */
        .oral-body { display: flex; flex: 1; overflow: hidden; }
        .oral-left { width: 38%; border-right: 1.5px solid #e2e8f0; display: flex; flex-direction: column; overflow: hidden; }
        .oral-right { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
        /* Mobile: hide desktop layout, show tab layout */
        .oral-mobile-tabs { display: none; }
        .oral-mobile-content { display: none; }
        @media (max-width: 699px) {
          .oral-body { display: none; }
          .oral-mobile-tabs { display: flex; flex-shrink: 0; }
          .oral-mobile-content { display: flex; flex: 1; flex-direction: column; overflow: hidden; }
        }
      `}</style>

      {/* ── TOP BAR ── */}
      <div style={{
        height: 52, display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 14px", background: "#fff", borderBottom: "1px solid #e2e8f0", flexShrink: 0,
      }}>
        <button onClick={() => window.location.href = "/modes"} style={{
          padding: "7px 12px", background: "#f1f5f9", color: "#374151",
          borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, cursor: "pointer", fontWeight: 600,
        }}>← Back</button>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{
            width: 7, height: 7, borderRadius: "50%",
            background: speaking ? "#f97316" : listening ? "#22c55e" : "#e2e8f0",
            boxShadow: speaking ? "0 0 7px #f97316" : listening ? "0 0 7px #22c55e" : "none",
          }} />
          <span style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>🎙 Oral Mode</span>
        </div>

        {/* Controls */}
        <div style={{ display: "flex", gap: 5 }}>
          <div style={{ display: "flex", background: "#f1f5f9", borderRadius: 7, padding: 2, border: "1px solid #e2e8f0" }}>
            {(["female", "male"] as Gender[]).map(g => (
              <button key={g} onClick={() => setGender(g)} style={{
                padding: "4px 8px", borderRadius: 5, border: "none",
                background: gender === g ? (g === "female" ? "#be185d" : "#1d4ed8") : "transparent",
                color: gender === g ? "#fff" : "#64748b",
                fontSize: 11, fontWeight: 700, cursor: "pointer",
              }}>{g === "female" ? "♀" : "♂"}</button>
            ))}
          </div>
          <div style={{ display: "flex", background: "#f1f5f9", borderRadius: 7, padding: 2, border: "1px solid #e2e8f0" }}>
            {(["auto", "en-IN", "hi-IN"] as Lang[]).map(l => (
              <button key={l} onClick={() => setLang(l)} style={{
                padding: "4px 7px", borderRadius: 5, border: "none",
                background: lang === l ? "#38bdf8" : "transparent",
                color: lang === l ? "#fff" : "#64748b",
                fontSize: 11, fontWeight: 700, cursor: "pointer",
              }}>{l === "auto" ? "AU" : l === "en-IN" ? "EN" : "HI"}</button>
            ))}
          </div>
        </div>
      </div>

      {/* ── DESKTOP: side-by-side ── */}
      <div className="oral-body">
        <div className="oral-left">
          <div style={{ padding: "10px 14px", borderBottom: "1px solid #e2e8f0", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "#94a3b8", flexShrink: 0 }}>
            CONVERSATION
          </div>
          {ChatHistory}
        </div>
        <div className="oral-right">
          {SpeakPanel}
        </div>
      </div>

      {/* ── MOBILE: tabs ── */}
      <div className="oral-mobile-tabs" style={{ borderBottom: "1px solid #e2e8f0", background: "#fff" }}>
        {(["speak", "chat"] as const).map(tab => (
          <button key={tab} onClick={() => setMobileTab(tab)} style={{
            flex: 1, padding: "12px", border: "none",
            background: mobileTab === tab ? "#fff" : "#f8fafc",
            borderBottom: mobileTab === tab ? "2px solid #38bdf8" : "2px solid transparent",
            fontSize: 13, fontWeight: 700, color: mobileTab === tab ? "#0f172a" : "#64748b",
            cursor: "pointer",
          }}>
            {tab === "speak" ? "🎙 Speak" : "💬 Chat"}
          </button>
        ))}
      </div>

      <div className="oral-mobile-content">
        {mobileTab === "speak" ? SpeakPanel : ChatHistory}
      </div>
    </div>
  );
}