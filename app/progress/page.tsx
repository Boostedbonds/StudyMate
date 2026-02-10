"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Header from "../components/Header";

/* ================= TYPES ================= */

type ExamAttempt = {
  id: string;
  date: string;
  mode: "examiner";
  subject: string;
  chapters: string[];
  timeTakenSeconds: number;
  rawAnswerText: string;
};

type SubjectKey =
  | "Maths"
  | "Science"
  | "English"
  | "Social Science"
  | "Hindi";

/* ================= CONSTANTS ================= */

const SUBJECTS: SubjectKey[] = [
  "Maths",
  "Science",
  "English",
  "Social Science",
  "Hindi",
];

const SUBJECT_COLORS: Record<SubjectKey, string> = {
  Maths: "#2563eb",
  Science: "#0d9488",
  English: "#7c3aed",
  "Social Science": "#ea580c",
  Hindi: "#4f46e5",
};

/* ================= LOGIC ================= */

function getProgressPercent(examsTaken: number) {
  if (examsTaken >= 6) return 90;
  if (examsTaken >= 4) return 70;
  if (examsTaken >= 3) return 55;
  if (examsTaken >= 2) return 35;
  if (examsTaken >= 1) return 20;
  return 0;
}

function getStatus(percent: number) {
  if (percent >= 80) return "Excellent";
  if (percent >= 60) return "Good";
  if (percent >= 40) return "Okay";
  if (percent > 0) return "Needs Work";
  return "Not started";
}

/* ================= PAGE ================= */

export default function ProgressPage() {
  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("studymate_exam_attempts");
    if (stored) {
      setAttempts(JSON.parse(stored));
    }
  }, []);

  const subjectStats = useMemo(() => {
    const countMap: Record<SubjectKey, number> = {
      Maths: 0,
      Science: 0,
      English: 0,
      "Social Science": 0,
      Hindi: 0,
    };

    attempts.forEach((a) => {
      if (countMap[a.subject as SubjectKey] !== undefined) {
        countMap[a.subject as SubjectKey]++;
      }
    });

    return SUBJECTS.map((subject) => {
      const count = countMap[subject];
      const percent = getProgressPercent(count);
      return {
        subject,
        percent,
        status: getStatus(percent),
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
    a.download = "studymate-progress.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImportFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        if (Array.isArray(parsed)) {
          localStorage.setItem(
            "studymate_exam_attempts",
            JSON.stringify(parsed)
          );
          setAttempts(parsed);
          alert("Progress imported successfully.");
        } else {
          alert("Invalid file.");
        }
      } catch {
        alert("Failed to import file.");
      }
    };
    reader.readAsText(file);
  }

  function downloadPDF() {
    window.print();
  }

  /* ================= UI ================= */

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 40%, #e0e7ff 100%)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Header onLogout={() => (window.location.href = "/")} />

      <main
        style={{
          flex: 1,
          maxWidth: 1200,
          margin: "0 auto",
          padding: "32px",
        }}
      >
        {/* TOP ACTION BAR */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 32,
          }}
        >
          <button
            onClick={() => (window.location.href = "/modes")}
            style={{
              padding: "10px 16px",
              background: "#2563eb",
              color: "#ffffff",
              borderRadius: 12,
              border: "none",
              cursor: "pointer",
            }}
          >
            ← Back
          </button>

          <div style={{ display: "flex", gap: 12 }}>
            <button
              onClick={exportProgress}
              style={{
                padding: "10px 16px",
                borderRadius: 12,
                border: "none",
                background: "#0d9488",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              Export
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                padding: "10px 16px",
                borderRadius: 12,
                border: "none",
                background: "#7c3aed",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              Import
            </button>

            <button
              onClick={downloadPDF}
              style={{
                padding: "10px 16px",
                borderRadius: 12,
                border: "none",
                background: "#334155",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              Download PDF
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              hidden
              onChange={(e) =>
                e.target.files && handleImportFile(e.target.files[0])
              }
            />
          </div>
        </div>

        <h1 style={{ fontSize: 36, marginBottom: 8 }}>
          Progress Dashboard
        </h1>
        <p style={{ color: "#475569", fontSize: 18, marginBottom: 32 }}>
          Subject-wise syllabus progress (Examiner Mode only)
        </p>

        {/* MAIN CONTENT */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr",
            gap: 40,
            alignItems: "center",
          }}
        >
          {/* GRAPH */}
          <div
            style={{
              background: "#ffffff",
              borderRadius: 24,
              padding: "36px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.08)",
              display: "flex",
              gap: 36,
              alignItems: "flex-end",
              height: 320,
            }}
          >
            {subjectStats.map((s) => (
              <div
                key={s.subject}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <div
                  style={{
                    height: 200,
                    width: 48,
                    background: "#e5e7eb",
                    borderRadius: 12,
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "flex-end",
                  }}
                >
                  <div
                    style={{
                      height: `${s.percent}%`,
                      width: "100%",
                      background: SUBJECT_COLORS[s.subject],
                      transition: "height 0.8s ease",
                    }}
                  />
                </div>

                <strong>{s.subject}</strong>
                <span
                  style={{
                    fontSize: 13,
                    color: SUBJECT_COLORS[s.subject],
                  }}
                >
                  {s.status}
                </span>
              </div>
            ))}
          </div>

          {/* FEEDBACK */}
          <div>
            <h2 style={{ fontSize: 22, marginBottom: 12 }}>
              Progress Summary
            </h2>
            <p style={{ color: "#475569", lineHeight: 1.7 }}>
              This dashboard reflects the student’s overall subject-wise
              growth based on exams attempted so far. Subjects marked
              as “Not started” have not yet been assessed. Consistent
              practice through Examiner Mode will gradually improve
              mastery and confidence across the syllabus.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
