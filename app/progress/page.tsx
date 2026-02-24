"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Header from "../components/Header";
import { supabaseClient as supabase } from "../lib/supabase-client";

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

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

type SubjectStat = {
  subject: string;
  scores: number[];
  latest: number;
  best: number;
  band: { label: string; color: string };
  trend: { label: string; color: string; delta: number | null };
  color: string;
  gapToNext: { marks: number; grade: string } | null;
};

// ─────────────────────────────────────────────────────────────
// GRADE HELPERS
// ─────────────────────────────────────────────────────────────

const GRADES = [
  { min: 90, label: "A1", color: "#059669" },
  { min: 75, label: "A2", color: "#0d9488" },
  { min: 60, label: "B1", color: "#2563eb" },
  { min: 45, label: "B2", color: "#7c3aed" },
  { min: 33, label: "C",  color: "#d97706" },
  { min: 0,  label: "F",  color: "#dc2626" },
];

function getGrade(score: number) {
  return GRADES.find((g) => score >= g.min) || GRADES[GRADES.length - 1];
}

// How many marks to the next grade threshold?
function getGapToNext(score: number): { marks: number; grade: string } | null {
  for (let i = 0; i < GRADES.length - 1; i++) {
    if (score < GRADES[i].min) {
      return { marks: GRADES[i].min - score, grade: GRADES[i].label };
    }
  }
  return null; // already at A1
}

function getTrend(scores: number[]): { label: string; color: string; delta: number | null } {
  if (scores.length < 2) return { label: "First attempt", color: "#94a3b8", delta: null };
  const delta = scores[scores.length - 1] - scores[scores.length - 2];
  if (delta > 0)  return { label: `+${delta}% vs last`, color: "#059669", delta };
  if (delta < 0)  return { label: `${delta}% vs last`,  color: "#dc2626", delta };
  return               { label: "No change",            color: "#d97706", delta: 0 };
}

const SUBJECT_COLORS = [
  "#2563eb", "#0d9488", "#7c3aed",
  "#ea580c", "#4f46e5", "#059669",
];

// ─────────────────────────────────────────────────────────────
// BUTTON STYLES  (match OralPage exactly)
// ─────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────
// SPARKLINE — mini SVG line chart for score history
// ─────────────────────────────────────────────────────────────

function Sparkline({ scores, color }: { scores: number[]; color: string }) {
  if (scores.length < 2) return null;

  const W = 80, H = 32, PAD = 3;
  const minS = Math.min(...scores, 0);
  const maxS = Math.max(...scores, 100);
  const range = maxS - minS || 1;

  const pts = scores.map((s, i) => {
    const x = PAD + (i / (scores.length - 1)) * (W - PAD * 2);
    const y = H - PAD - ((s - minS) / range) * (H - PAD * 2);
    return `${x},${y}`;
  });

  return (
    <svg width={W} height={H} style={{ display: "block" }}>
      <polyline
        points={pts.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.85}
      />
      {/* last point dot */}
      {pts.length > 0 && (() => {
        const last = pts[pts.length - 1].split(",");
        return (
          <circle cx={last[0]} cy={last[1]} r={3} fill={color} />
        );
      })()}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────

export default function ProgressPage() {
  const [attempts, setAttempts]   = useState<ExamAttempt[]>([]);
  const [aiSummary, setAiSummary] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [loading, setLoading]     = useState(true);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => { fetchAttempts(); }, []);

  // ── Fetch from Supabase or localStorage ─────────────────────
  async function fetchAttempts() {
    setLoading(true);
    let name = "", cls = "";
    try {
      const stored = localStorage.getItem("shauri_student");
      if (stored) { const s = JSON.parse(stored); name = s?.name || ""; cls = s?.class || ""; }
    } catch {}

    if (!name || !cls) {
      try {
        const local = localStorage.getItem("shauri_exam_attempts");
        if (local) { const parsed = JSON.parse(local); setAttempts(parsed); }
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
    setLoading(false);
  }

  // ── Derive per-subject stats ─────────────────────────────────
  const subjects: SubjectStat[] = useMemo(() => {
    const map: Record<string, number[]> = {};
    attempts.forEach((a) => {
      if (typeof a.scorePercent === "number") {
        map[a.subject] ??= [];
        map[a.subject].push(a.scorePercent);
      }
    });
    return Object.entries(map).map(([subject, scores], idx) => {
      const latest = scores[scores.length - 1];
      return {
        subject,
        scores,
        latest,
        best: Math.max(...scores),
        band: getGrade(latest),
        trend: getTrend(scores),
        color: SUBJECT_COLORS[idx % SUBJECT_COLORS.length],
        gapToNext: getGapToNext(latest),
      };
    });
  }, [attempts]);

  // ── Stat strip values ────────────────────────────────────────
  const overallAvg = subjects.length
    ? Math.round(subjects.reduce((s, x) => s + x.latest, 0) / subjects.length)
    : null;

  const bestSubject = subjects.length
    ? subjects.reduce((a, b) => (a.latest >= b.latest ? a : b))
    : null;

  const mostImproved = subjects
    .filter((s) => s.trend.delta !== null && s.trend.delta! > 0)
    .sort((a, b) => b.trend.delta! - a.trend.delta!)[0] ?? null;

  const totalExams = attempts.length;

  // ── AI summary — passes full subject data, not raw attempts ──
  useEffect(() => {
    if (!subjects.length) return;
    generateAISummary(subjects);
  }, [subjects.length]); // re-run only when subject count changes

  async function generateAISummary(data: SubjectStat[]) {
    setAiLoading(true);
    try {
      // Build a tight, structured payload — AI sees trends + gaps, not raw rows
      const payload = data.map((s) => ({
        subject:      s.subject,
        latestScore:  s.latest,
        allScores:    s.scores,
        grade:        s.band.label,
        trend:        s.trend.label,
        trendDelta:   s.trend.delta,
        gapToNext:    s.gapToNext,
        attempts:     s.scores.length,
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "progress", subjectStats: payload }),
      });
      const result = await res.json();
      if (typeof result?.reply === "string") setAiSummary(result.reply);
    } catch {}
    setAiLoading(false);
  }

  // ── Export / import / report (unchanged logic) ───────────────
  function exportProgress() {
    const blob = new Blob([JSON.stringify(attempts, null, 2)], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a"); a.href = url; a.download = "Shauri-progress.json"; a.click();
    URL.revokeObjectURL(url);
  }

  function generateReport() {
    const lines = [
      "SHAURI PROGRESS REPORT", "======================", "",
      ...subjects.map((s) =>
        `Subject: ${s.subject}\nLatest: ${s.latest}%  Best: ${s.best}%  Grade: ${s.band.label}\nTrend: ${s.trend.label}\n`
      ),
      "AI Academic Insight:", aiSummary || "No AI summary available yet.",
    ].join("\n");
    const blob = new Blob([lines], { type: "text/plain" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a"); a.href = url; a.download = "Shauri-progress-report.txt"; a.click();
    URL.revokeObjectURL(url);
  }

  function handleImportFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        if (Array.isArray(parsed)) setAttempts(parsed);
      } catch { alert("Invalid file format."); }
    };
    reader.readAsText(file);
  }

  // ── Chart reference lines (pass mark 33%, distinction 75%) ──
  const CHART_H = 220;
  const passY   = CHART_H - (33 / 100) * CHART_H;   // y position of 33% line
  const distY   = CHART_H - (75 / 100) * CHART_H;   // y position of 75% line

  // ─────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#f8fafc" }}>
      <Header onLogout={() => (window.location.href = "/")} />

      {/* ── Nav bar ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px 0" }}>
        <button style={btnBase} onClick={() => (window.location.href = "/modes")}>← Modes</button>
        <div style={{ display: "flex", gap: 10 }}>
          <button style={btnGhost} onClick={exportProgress}>Export</button>
          <button style={btnGhost} onClick={() => fileInputRef.current?.click()}>Import</button>
          <button style={btnBase}  onClick={generateReport}>Download Report</button>
        </div>
      </div>

      <input ref={fileInputRef} type="file" accept="application/json" hidden
        onChange={(e) => e.target.files && handleImportFile(e.target.files[0])} />

      <main style={{ flex: 1, maxWidth: 1200, margin: "0 auto", padding: "32px 24px 64px", width: "100%" }}>

        <h1 style={{ textAlign: "center", fontSize: 32, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>
          Progress Dashboard
        </h1>
        <p style={{ textAlign: "center", color: "#64748b", marginBottom: 36, fontSize: 15 }}>
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
            background: "#fff", borderRadius: 20, border: "1.5px dashed #cbd5e1",
          }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>📊</div>
            <p style={{ fontSize: 17, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>No exam data yet</p>
            <p style={{ fontSize: 14, color: "#64748b", marginBottom: 24 }}>
              Complete an exam in Examiner Mode to see your progress here.
            </p>
            <button style={btnBase} onClick={() => (window.location.href = "/modes")}>
              Go to Examiner Mode
            </button>
          </div>
        )}

        {/* ── DASHBOARD ── */}
        {!loading && subjects.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>

            {/* ════════════════════════════════════════════════
                SECTION 1 — STAT STRIP
                4 numbers, scannable in 2 seconds
            ════════════════════════════════════════════════ */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>

              {/* Overall average */}
              <StatCard
                icon="📊"
                label="Overall Average"
                value={overallAvg !== null ? `${overallAvg}%` : "—"}
                sub={overallAvg !== null ? getGrade(overallAvg).label : ""}
                subColor={overallAvg !== null ? getGrade(overallAvg).color : "#94a3b8"}
                accent="#2563eb"
              />

              {/* Best subject */}
              <StatCard
                icon="🏆"
                label="Best Subject"
                value={bestSubject?.subject ?? "—"}
                sub={bestSubject ? `${bestSubject.latest}%` : ""}
                subColor="#059669"
                accent="#059669"
              />

              {/* Most improved */}
              <StatCard
                icon="📈"
                label="Most Improved"
                value={mostImproved?.subject ?? "—"}
                sub={mostImproved ? `+${mostImproved.trend.delta}% this attempt` : "Need 2+ attempts"}
                subColor="#0d9488"
                accent="#0d9488"
              />

              {/* Total exams */}
              <StatCard
                icon="📝"
                label="Exams Taken"
                value={String(totalExams)}
                sub={totalExams === 1 ? "1 exam completed" : `${totalExams} exams completed`}
                subColor="#7c3aed"
                accent="#7c3aed"
              />
            </div>

            {/* ════════════════════════════════════════════════
                SECTION 2 — BAR CHART  +  AI INSIGHT
            ════════════════════════════════════════════════ */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 24, alignItems: "start" }}>

              {/* Bar chart with reference lines */}
              <div style={{ background: "#fff", borderRadius: 20, padding: "28px 32px", border: "1px solid #e2e8f0" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: 0 }}>Subject Performance</h2>
                  {/* Legend */}
                  <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <div style={{ width: 24, height: 2, background: "#f59e0b", borderTop: "2px dashed #f59e0b" }} />
                      <span style={{ fontSize: 11, color: "#64748b" }}>Pass 33%</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <div style={{ width: 24, height: 2, background: "#2563eb", borderTop: "2px dashed #2563eb" }} />
                      <span style={{ fontSize: 11, color: "#64748b" }}>Distinction 75%</span>
                    </div>
                  </div>
                </div>

                {/* Chart area — positioned so reference lines overlay bars */}
                <div style={{ position: "relative", height: CHART_H, marginBottom: 0 }}>

                  {/* Pass mark line — 33% */}
                  <div style={{
                    position: "absolute", left: 0, right: 0,
                    top: passY,
                    borderTop: "2px dashed #f59e0b",
                    zIndex: 2,
                  }}>
                    <span style={{ position: "absolute", right: 0, top: -16, fontSize: 10, color: "#f59e0b", fontWeight: 600 }}>33%</span>
                  </div>

                  {/* Distinction line — 75% */}
                  <div style={{
                    position: "absolute", left: 0, right: 0,
                    top: distY,
                    borderTop: "2px dashed #2563eb",
                    zIndex: 2,
                  }}>
                    <span style={{ position: "absolute", right: 0, top: -16, fontSize: 10, color: "#2563eb", fontWeight: 600 }}>75%</span>
                  </div>

                  {/* Bars */}
                  <div style={{
                    position: "absolute", bottom: 0, left: 0, right: 0,
                    display: "flex", alignItems: "flex-end",
                    gap: subjects.length > 5 ? 10 : 20,
                    height: "100%",
                    borderBottom: "2px solid #f1f5f9",
                  }}>
                    {subjects.map((s) => {
                      const barH = Math.max((s.latest / 100) * CHART_H, 6);
                      return (
                        <div key={s.subject} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, minWidth: 0 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: s.color, marginBottom: 4 }}>{s.latest}%</span>
                          <div style={{
                            height: barH, width: "100%", maxWidth: 52,
                            background: s.color, borderRadius: "8px 8px 0 0", opacity: 0.88,
                          }} />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* X-axis */}
                <div style={{
                  display: "flex",
                  gap: subjects.length > 5 ? 10 : 20,
                  marginTop: 10,
                  borderTop: "2px solid #f1f5f9",
                  paddingTop: 10,
                }}>
                  {subjects.map((s) => (
                    <div key={s.subject} style={{
                      flex: 1, minWidth: 0,
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                    }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: "#334155", textAlign: "center", wordBreak: "break-word" }}>
                        {s.subject.length > 9 ? s.subject.slice(0, 8) + "…" : s.subject}
                      </span>
                      <span style={{ fontSize: 10, color: s.band.color, fontWeight: 700 }}>{s.band.label}</span>
                      <span style={{ fontSize: 10, color: s.trend.color }}>{s.trend.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── AI Insight ── */}
              <div style={{
                background: "#fff", borderRadius: 20,
                padding: 24, border: "1px solid #e2e8f0",
                display: "flex", flexDirection: "column", gap: 16,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: "50%", background: "#eff6ff",
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0,
                  }}>🤖</div>
                  <h2 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", margin: 0 }}>AI Academic Insight</h2>
                </div>

                {aiLoading ? (
                  <p style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.6, margin: 0 }}>
                    Analysing your performance…
                  </p>
                ) : aiSummary ? (
                  /* Render the 4-line structured AI output */
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {aiSummary.split("\n").filter(Boolean).map((line, i) => (
                      <div key={i} style={{
                        fontSize: 13, lineHeight: 1.65, color: "#334155",
                        padding: "8px 12px",
                        background: "#f8fafc", borderRadius: 10,
                        borderLeft: `3px solid ${
                          line.startsWith("💪") ? "#059669" :
                          line.startsWith("⚠️") ? "#dc2626" :
                          line.startsWith("📈") ? "#0d9488" :
                          "#2563eb"
                        }`,
                      }}>
                        {line}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.6, margin: 0 }}>
                    Analysis will appear after tests are evaluated.
                  </p>
                )}
              </div>
            </div>

            {/* ════════════════════════════════════════════════
                SECTION 3 — SUBJECT CARDS
                Sparkline + gap to next grade
            ════════════════════════════════════════════════ */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
              {subjects.map((s) => (
                <div key={s.subject} style={{
                  background: "#fff", borderRadius: 16,
                  padding: "20px 20px 16px",
                  border: "1px solid #e2e8f0",
                  borderTop: `3px solid ${s.color}`,
                  display: "flex", flexDirection: "column", gap: 10,
                }}>
                  {/* Subject name + grade badge */}
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", wordBreak: "break-word", flex: 1 }}>
                      {s.subject}
                    </span>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: "2px 8px",
                      background: s.band.color, color: "#fff", borderRadius: 6,
                      flexShrink: 0, lineHeight: "18px",
                    }}>
                      {s.band.label}
                    </span>
                  </div>

                  {/* Big score */}
                  <div style={{ fontSize: 32, fontWeight: 800, color: s.color, lineHeight: 1 }}>
                    {s.latest}%
                  </div>

                  {/* Sparkline (only shown with 2+ attempts) */}
                  {s.scores.length >= 2 && (
                    <div>
                      <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 4 }}>Score history</div>
                      <Sparkline scores={s.scores} color={s.color} />
                    </div>
                  )}

                  {/* Trend pill */}
                  <span style={{
                    display: "inline-block", fontSize: 11, fontWeight: 600,
                    padding: "3px 10px", borderRadius: 50,
                    background: s.trend.color + "18", color: s.trend.color,
                    alignSelf: "flex-start",
                  }}>
                    {s.trend.label}
                  </span>

                  {/* Gap to next grade — the most actionable line */}
                  {s.gapToNext ? (
                    <div style={{
                      fontSize: 11, color: "#64748b",
                      padding: "6px 10px", background: "#f8fafc",
                      borderRadius: 8, lineHeight: 1.5,
                    }}>
                      🎯 <strong>{s.gapToNext.marks} more marks</strong> → {s.gapToNext.grade}
                    </div>
                  ) : (
                    <div style={{ fontSize: 11, color: "#059669", fontWeight: 600 }}>
                      ✅ Top grade achieved!
                    </div>
                  )}

                  {/* Attempts count */}
                  {s.scores.length > 1 && (
                    <div style={{ fontSize: 10, color: "#94a3b8" }}>
                      Best: {s.best}% · {s.scores.length} attempts
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

// ─────────────────────────────────────────────────────────────
// STAT CARD  — used in the top strip
// ─────────────────────────────────────────────────────────────

function StatCard({
  icon, label, value, sub, subColor, accent,
}: {
  icon: string;
  label: string;
  value: string;
  sub: string;
  subColor: string;
  accent: string;
}) {
  return (
    <div style={{
      background: "#fff", borderRadius: 16,
      padding: "20px 20px 18px",
      border: "1px solid #e2e8f0",
      borderTop: `3px solid ${accent}`,
      display: "flex", flexDirection: "column", gap: 4,
    }}>
      <div style={{ fontSize: 22, marginBottom: 2 }}>{icon}</div>
      <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", lineHeight: 1.2, wordBreak: "break-word" }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 12, fontWeight: 600, color: subColor }}>
          {sub}
        </div>
      )}
    </div>
  );
}