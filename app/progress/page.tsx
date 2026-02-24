"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Header from "../components/Header";
import { supabaseClient as supabase } from "../lib/supabase-client";

type ExamAttempt = {
  id: string;
  date: string;
  mode: "examiner";
  subject: string;
  chapters: string[];
  timeTakenSeconds: number;
  rawAnswerText: string;
  scorePercent?: number;
};

function getBand(score: number) {
  if (score >= 86) return { label: "Excellent", color: "#059669" };
  if (score >= 71) return { label: "Good",      color: "#2563eb" };
  if (score >= 51) return { label: "Average",   color: "#d97706" };
  if (score >= 31) return { label: "Weak",      color: "#ea580c" };
  return               { label: "Needs Work",   color: "#dc2626" };
}

function getTrend(scores: number[]) {
  if (scores.length < 2) return { label: "—", color: "#94a3b8" };
  const diff = scores[scores.length - 1] - scores[scores.length - 2];
  if (diff > 0) return { label: "↑ Improving", color: "#059669" };
  if (diff < 0) return { label: "↓ Declining", color: "#dc2626" };
  return               { label: "→ Stable",    color: "#d97706" };
}

const SUBJECT_COLORS = [
  "#2563eb", "#0d9488", "#7c3aed",
  "#ea580c", "#4f46e5", "#059669",
];

// ── Shared button styles — matches OralPage exactly ───────
const btnBase: React.CSSProperties = {
  padding: "10px 18px",
  background: "#2563eb",
  color: "#ffffff",
  borderRadius: 12,
  border: "none",
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
};

const btnGhost: React.CSSProperties = {
  ...btnBase,
  background: "transparent",
  color: "#2563eb",
  border: "1.5px solid #2563eb",
};

export default function ProgressPage() {
  const [attempts, setAttempts]   = useState<ExamAttempt[]>([]);
  const [aiSummary, setAiSummary] = useState("");
  const [loading, setLoading]     = useState(true);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => { fetchAttempts(); }, []);

  async function fetchAttempts() {
    setLoading(true);
    let name = "", cls = "";
    try {
      const stored = localStorage.getItem("shauri_student");
      if (stored) {
        const s = JSON.parse(stored);
        name = s?.name || "";
        cls  = s?.class || "";
      }
    } catch {}

    if (!name || !cls) {
      try {
        const local = localStorage.getItem("shauri_exam_attempts");
        if (local) {
          const parsed = JSON.parse(local);
          setAttempts(parsed);
          generateAISummary(parsed);
        }
      } catch {}
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("exam_attempts")
      .select("*")
      .eq("student_name", name)
      .eq("class", cls)
      .order("created_at", { ascending: true });

    if (error) { console.error(error); setLoading(false); return; }

    const mapped: ExamAttempt[] = (data || []).map((d: any) => ({
      id: d.id,
      date: d.created_at,
      mode: "examiner",
      subject: d.subject || "General",
      chapters: [],
      timeTakenSeconds: 0,
      rawAnswerText: "",
      scorePercent: d.percentage,
    }));

    setAttempts(mapped);
    generateAISummary(mapped);
    setLoading(false);
  }

  async function generateAISummary(data: ExamAttempt[]) {
    if (!data.length) return;
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "progress", attempts: data }),
      });
      const result = await res.json();
      if (typeof result?.reply === "string") setAiSummary(result.reply);
    } catch {}
  }

  const subjects = useMemo(() => {
    const map: Record<string, number[]> = {};
    attempts.forEach((a) => {
      if (typeof a.scorePercent === "number") {
        map[a.subject] ??= [];
        map[a.subject].push(a.scorePercent);
      }
    });
    return Object.entries(map).map(([subject, scores], index) => {
      const latest = scores[scores.length - 1];
      return {
        subject, scores, latest,
        band:  getBand(latest),
        trend: getTrend(scores),
        color: SUBJECT_COLORS[index % SUBJECT_COLORS.length],
      };
    });
  }, [attempts]);

  const overallAvg = subjects.length
    ? Math.round(subjects.reduce((s, x) => s + x.latest, 0) / subjects.length)
    : null;

  function exportProgress() {
    const blob = new Blob([JSON.stringify(attempts, null, 2)], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = "Shauri-progress.json"; a.click();
    URL.revokeObjectURL(url);
  }

  function generateReport() {
    const lines = [
      "SHAURI PROGRESS REPORT", "======================", "",
      ...subjects.map((s) =>
        `Subject: ${s.subject}\nLatest Score: ${s.latest}%\nBand: ${s.band.label}\nTrend: ${s.trend.label}\n`
      ),
      "AI Academic Insight:",
      aiSummary || "No AI summary available yet.",
    ].join("\n");
    const blob = new Blob([lines], { type: "text/plain" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = "Shauri-progress-report.txt"; a.click();
    URL.revokeObjectURL(url);
  }

  function handleImportFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        if (Array.isArray(parsed)) { setAttempts(parsed); generateAISummary(parsed); }
      } catch { alert("Invalid file format."); }
    };
    reader.readAsText(file);
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#f8fafc" }}>
      <Header onLogout={() => (window.location.href = "/")} />

      {/* ── Top nav — same padding + button style as OralPage ── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "20px 24px 0",
      }}>
        <button style={btnBase} onClick={() => (window.location.href = "/modes")}>
          ← Modes
        </button>
        <div style={{ display: "flex", gap: 10 }}>
          <button style={btnGhost} onClick={exportProgress}>Export</button>
          <button style={btnGhost} onClick={() => fileInputRef.current?.click()}>Import</button>
          <button style={btnBase}  onClick={generateReport}>Download Report</button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        hidden
        onChange={(e) => e.target.files && handleImportFile(e.target.files[0])}
      />

      <main style={{
        flex: 1,
        maxWidth: 1200,
        margin: "0 auto",
        padding: "32px 24px 64px",
        width: "100%",
      }}>

        {/* ── Title — matches OralPage h1 center style ── */}
        <h1 style={{ textAlign: "center", fontSize: 32, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>
          Progress Dashboard
        </h1>
        <p style={{ textAlign: "center", color: "#64748b", marginBottom: 40, fontSize: 15 }}>
          Track your performance across all subjects
        </p>

        {/* ── Loading ── */}
        {loading && (
          <p style={{ textAlign: "center", color: "#94a3b8", fontSize: 15, marginTop: 60 }}>
            Loading your results…
          </p>
        )}

        {/* ── Empty state ── */}
        {!loading && subjects.length === 0 && (
          <div style={{
            textAlign: "center", padding: "64px 24px",
            background: "#fff", borderRadius: 20,
            border: "1.5px dashed #cbd5e1",
          }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>📊</div>
            <p style={{ fontSize: 17, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>
              No exam data yet
            </p>
            <p style={{ fontSize: 14, color: "#64748b", marginBottom: 24 }}>
              Complete an exam in Examiner Mode to see your progress here.
            </p>
            <button style={btnBase} onClick={() => (window.location.href = "/modes")}>
              Go to Examiner Mode
            </button>
          </div>
        )}

        {/* ── Dashboard ── */}
        {!loading && subjects.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>

            {/* Overall average pill */}
            {overallAvg !== null && (
              <div style={{ display: "flex", justifyContent: "center" }}>
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 12,
                  background: "#eff6ff", border: "1.5px solid #bfdbfe",
                  borderRadius: 50, padding: "10px 28px",
                }}>
                  <span style={{ fontSize: 14, color: "#2563eb", fontWeight: 600 }}>Overall Average</span>
                  <span style={{ fontSize: 22, fontWeight: 800, color: "#1d4ed8" }}>{overallAvg}%</span>
                  <span style={{
                    fontSize: 12, fontWeight: 600, padding: "3px 12px",
                    background: getBand(overallAvg).color, color: "#fff", borderRadius: 50,
                  }}>
                    {getBand(overallAvg).label}
                  </span>
                </div>
              </div>
            )}

            {/* Bar chart + AI insight side by side */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 24, alignItems: "start" }}>

              {/* ── Bar chart ── */}
              <div style={{
                background: "#fff", borderRadius: 20,
                padding: "28px 32px", border: "1px solid #e2e8f0",
              }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", marginBottom: 28, margin: "0 0 28px" }}>
                  Subject Performance
                </h2>
                <div style={{
                  display: "flex", alignItems: "flex-end",
                  gap: subjects.length > 5 ? 12 : 24,
                  height: 240,
                  borderBottom: "2px solid #f1f5f9",
                }}>
                  {subjects.map((s) => {
                    const barH = Math.max((s.latest / 100) * 210, 8);
                    return (
                      <div key={s.subject} style={{
                        display: "flex", flexDirection: "column",
                        alignItems: "center", flex: 1, minWidth: 0,
                      }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: s.color, marginBottom: 6 }}>
                          {s.latest}%
                        </span>
                        <div style={{
                          height: barH, width: "100%", maxWidth: 48,
                          background: s.color, borderRadius: "8px 8px 0 0",
                          opacity: 0.88,
                        }} />
                      </div>
                    );
                  })}
                </div>
                {/* X-axis labels */}
                <div style={{ display: "flex", gap: subjects.length > 5 ? 12 : 24, marginTop: 10 }}>
                  {subjects.map((s) => (
                    <div key={s.subject} style={{
                      flex: 1, minWidth: 0,
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                    }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: "#334155", textAlign: "center", wordBreak: "break-word" }}>
                        {s.subject.length > 9 ? s.subject.slice(0, 8) + "…" : s.subject}
                      </span>
                      <span style={{ fontSize: 10, color: s.band.color,  fontWeight: 600 }}>{s.band.label}</span>
                      <span style={{ fontSize: 10, color: s.trend.color              }}>{s.trend.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── AI insight ── */}
              <div style={{
                background: "#fff", borderRadius: 20,
                padding: 28, border: "1px solid #e2e8f0",
                display: "flex", flexDirection: "column", gap: 16,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: "50%",
                    background: "#eff6ff",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 18, flexShrink: 0,
                  }}>🤖</div>
                  <h2 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", margin: 0 }}>
                    AI Academic Insight
                  </h2>
                </div>
                <p style={{ fontSize: 14, lineHeight: 1.75, color: "#334155", margin: 0 }}>
                  {aiSummary || "Generating your personalised analysis…"}
                </p>
              </div>
            </div>

            {/* ── Per-subject cards ── */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
              gap: 16,
            }}>
              {subjects.map((s) => (
                <div key={s.subject} style={{
                  background: "#fff", borderRadius: 16,
                  padding: "20px 18px 18px",
                  border: "1px solid #e2e8f0",
                  borderTop: `3px solid ${s.color}`,
                }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 10, wordBreak: "break-word" }}>
                    {s.subject}
                  </div>
                  <div style={{ fontSize: 30, fontWeight: 800, color: s.color, lineHeight: 1 }}>
                    {s.latest}%
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: "2px 9px",
                      background: s.band.color + "18", color: s.band.color, borderRadius: 50,
                    }}>
                      {s.band.label}
                    </span>
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: "2px 9px",
                      background: s.trend.color + "18", color: s.trend.color, borderRadius: 50,
                    }}>
                      {s.trend.label}
                    </span>
                  </div>
                  {s.scores.length > 1 && (
                    <div style={{ marginTop: 10, fontSize: 11, color: "#94a3b8" }}>
                      {s.scores.length} attempts
                    </div>
                  )}
                </div>
              ))}
            </div>

          </div>
        )}
      </main>
    </div>
  );
}