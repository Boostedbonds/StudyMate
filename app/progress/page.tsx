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
  if (score >= 86) return "Excellent";
  if (score >= 71) return "Good";
  if (score >= 51) return "Average";
  if (score >= 31) return "Weak";
  return "Needs Work";
}

function getTrend(scores: number[]) {
  if (scores.length < 2) return "—";
  const diff = scores[scores.length - 1] - scores[scores.length - 2];
  if (diff > 0) return "↑ Improving";
  if (diff < 0) return "↓ Declining";
  return "→ Stable";
}

const SUBJECT_COLORS = [
  "#2563eb", "#0d9488", "#7c3aed",
  "#ea580c", "#4f46e5", "#059669",
];

export default function ProgressPage() {
  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const [aiSummary, setAiSummary] = useState("");

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    fetchAttempts();
  }, []);

  async function fetchAttempts() {
    let name = "";
    let cls = "";
    try {
      const stored = localStorage.getItem("shauri_student");
      if (stored) {
        const student = JSON.parse(stored);
        name = student?.name || "";
        cls = student?.class || "";
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
      return;
    }

    const { data, error } = await supabase
      .from("exam_attempts")
      .select("*")
      .eq("student_name", name)
      .eq("class", cls)
      .order("created_at", { ascending: true });

    if (error) {
      console.error(error);
      return;
    }

    const mapped: ExamAttempt[] =
      data?.map((d: any) => ({
        id: d.id,
        date: d.created_at,
        mode: "examiner",
        subject: d.subject || "General",
        chapters: [],
        timeTakenSeconds: 0,
        rawAnswerText: "",
        scorePercent: d.percentage,
      })) || [];

    setAttempts(mapped);
    generateAISummary(mapped);
  }

  async function generateAISummary(data: ExamAttempt[]) {
    if (!data.length) return;

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "progress", attempts: data }),
    });

    const result = await res.json();
    if (typeof result?.reply === "string") {
      setAiSummary(result.reply);
    }
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
        subject,
        scores,
        latest,
        band: getBand(latest),
        trend: getTrend(scores),
        color: SUBJECT_COLORS[index % SUBJECT_COLORS.length],
      };
    });
  }, [attempts]);

  function exportProgress() {
    const blob = new Blob([JSON.stringify(attempts, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Shauri-progress.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function generateReport() {
    const content = [
      "SHAURI PROGRESS REPORT",
      "======================",
      "",
      ...subjects.map(
        (s) =>
          `Subject: ${s.subject}\nLatest Score: ${s.latest}%\nBand: ${s.band}\nTrend: ${s.trend}\n`
      ),
      "AI Academic Insight:",
      aiSummary || "No AI summary available yet.",
    ].join("\n");

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Shauri-progress-report.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImportFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        if (Array.isArray(parsed)) {
          setAttempts(parsed);
          generateAISummary(parsed);
        }
      } catch {
        alert("Invalid file format.");
      }
    };
    reader.readAsText(file);
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background:
          "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 40%, #e0e7ff 100%)",
      }}
    >
      <Header onLogout={() => (window.location.href = "/")} />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          padding: "24px 32px",
          maxWidth: 1400,
          margin: "0 auto",
          width: "100%",
        }}
      >
        <button onClick={() => (window.location.href = "/modes")}>
          ← Back
        </button>
        <div style={{ display: "flex", gap: 12 }}>
          <button onClick={exportProgress}>Export</button>
          <button onClick={() => fileInputRef.current?.click()}>Import</button>
          <button onClick={generateReport}>Download Report</button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        hidden
        onChange={(e) =>
          e.target.files && handleImportFile(e.target.files[0])
        }
      />

      <main
        style={{
          flex: 1,
          maxWidth: 1400,
          margin: "0 auto",
          padding: "24px 32px 64px",
          width: "100%",
        }}
      >
        <h1 style={{ fontSize: 36, marginBottom: 24 }}>Progress Dashboard</h1>

        {subjects.length === 0 ? (
          <p>No exam data available yet. Complete an exam in Examiner Mode first.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 40 }}>
            <div
              style={{
                background: "#fff",
                borderRadius: 24,
                padding: 32,
                display: "flex",
                alignItems: "flex-end",
                gap: 30,
                height: 320,
              }}
            >
              {subjects.map((s) => {
                const barHeight = Math.max((s.latest / 100) * 260, 8);
                return (
                  <div
                    key={s.subject}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      flex: 1,
                    }}
                  >
                    <div style={{ height: barHeight, width: 40, background: s.color, borderRadius: 8 }} />
                    <div style={{ marginTop: 10, fontSize: 13 }}>{s.subject}</div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{s.latest}%</div>
                    <div style={{ fontSize: 11, color: "#64748b" }}>{s.band}</div>
                    <div style={{ fontSize: 11, color: "#64748b" }}>{s.trend}</div>
                  </div>
                );
              })}
            </div>

            <div style={{ background: "#fff", borderRadius: 24, padding: 28 }}>
              <h2>AI Academic Analysis</h2>
              <p style={{ lineHeight: 1.7, color: "#334155" }}>
                {aiSummary || "Analysis will appear after tests are evaluated."}
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}