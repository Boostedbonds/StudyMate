"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Header from "../components/Header";

/* ================= Types ================= */

type ExamAttempt = {
  id: string;
  date: string;
  mode: "examiner";
  subject: string;
  chapters: string[];
  timeTakenSeconds: number;
  rawAnswerText: string;
};

type StudentContext = {
  name: string;
  class: string;
  board: string;
};

/* ================= Config ================= */

const SUBJECT_COLORS: Record<string, string> = {
  Maths: "#2563eb",
  Science: "#0d9488",
  English: "#7c3aed",
  "Social Science": "#ea580c",
  Hindi: "#4f46e5",
  Unknown: "#64748b",
};

/**
 * Approximate NCERT chapter counts per class & subject.
 * Used ONLY for progress calibration (not AI teaching).
 */
const SYLLABUS_SIZE: Record<string, Record<string, number>> = {
  "6": { Maths: 13, Science: 16, English: 10 },
  "7": { Maths: 15, Science: 18, English: 10 },
  "8": { Maths: 16, Science: 18, English: 10 },
  "9": { Maths: 15, Science: 15, English: 11, "Social Science": 20 },
  "10": { Maths: 15, Science: 13, English: 11, "Social Science": 20 },
  "11": { Maths: 16, Physics: 15, Chemistry: 14 },
  "12": { Maths: 13, Physics: 15, Chemistry: 16 },
};

/* ================= Helpers ================= */

function getStatus(percent: number) {
  if (percent >= 80) return "Excellent";
  if (percent >= 60) return "Good";
  if (percent >= 40) return "Okay";
  if (percent >= 20) return "Needs Work";
  return "Just Started";
}

/* ================= Component ================= */

export default function ProgressPage() {
  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const [student, setStudent] = useState<StudentContext | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  /* ---------- Load Student Context ---------- */
  useEffect(() => {
    const raw = localStorage.getItem("studymate_student");
    if (raw) {
      setStudent(JSON.parse(raw));
    }
  }, []);

  /* ---------- Load Examiner Attempts ---------- */
  useEffect(() => {
    const stored = localStorage.getItem("studymate_exam_attempts");
    if (stored) {
      setAttempts(JSON.parse(stored));
    }
  }, []);

  /* ---------- Subject-wise Progress ---------- */
  const subjectStats = useMemo(() => {
    if (!student) return [];

    const classLevel = student.class;
    const syllabusForClass = SYLLABUS_SIZE[classLevel] ?? {};

    const chapterMap: Record<string, Set<string>> = {};

    attempts.forEach((a) => {
      if (!chapterMap[a.subject]) {
        chapterMap[a.subject] = new Set();
      }
      a.chapters.forEach((ch) => chapterMap[a.subject].add(ch));
    });

    return Object.entries(chapterMap).map(([subject, chaptersSet]) => {
      const totalChapters =
        syllabusForClass[subject] ?? chaptersSet.size;

      const covered = chaptersSet.size;
      const percent =
        totalChapters > 0
          ? Math.min(
              100,
              Math.round((covered / totalChapters) * 100)
            )
          : 0;

      return {
        subject,
        percent,
        status: getStatus(percent),
      };
    });
  }, [attempts, student]);

  /* ---------- Export / Import ---------- */

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

  /* ================= Render ================= */

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
        {/* 🔙 Back */}
        <button
          onClick={() => (window.location.href = "/modes")}
          style={{
            padding: "10px 16px",
            background: "#2563eb",
            color: "#ffffff",
            borderRadius: 12,
            border: "none",
            fontSize: 14,
            cursor: "pointer",
            marginBottom: 24,
          }}
        >
          ← Back
        </button>

        <h1 style={{ fontSize: 36, marginBottom: 8 }}>
          Progress Dashboard
        </h1>
        <p style={{ color: "#475569", fontSize: 18, marginBottom: 32 }}>
          Subject-wise syllabus progress (Examiner Mode only)
        </p>

        {/* 📊 Graph */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: 24,
            padding: "40px 32px",
            boxShadow: "0 20px 40px rgba(0,0,0,0.08)",
            marginBottom: 40,
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 40,
              alignItems: "flex-end",
              height: 260,
              justifyContent:
                subjectStats.length === 0 ? "center" : "flex-start",
            }}
          >
            {subjectStats.length === 0 ? (
              <div style={{ color: "#64748b", fontSize: 16 }}>
                Progress will appear here as exams are taken.
              </div>
            ) : (
              subjectStats.map((s) => (
                <div
                  key={s.subject}
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      height: 200,
                      width: 48,
                      display: "flex",
                      alignItems: "flex-end",
                      background: "#e5e7eb",
                      borderRadius: 12,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: `${s.percent}%`,
                        width: "100%",
                        background:
                          SUBJECT_COLORS[s.subject] ??
                          SUBJECT_COLORS.Unknown,
                        transition: "height 0.8s ease",
                      }}
                    />
                  </div>

                  <div style={{ fontSize: 14, fontWeight: 600 }}>
                    {s.subject}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color:
                        SUBJECT_COLORS[s.subject] ??
                        SUBJECT_COLORS.Unknown,
                    }}
                  >
                    {s.status}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 🔘 Actions */}
        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={exportProgress}
            style={{
              padding: "10px 18px",
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
              padding: "10px 18px",
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
              padding: "10px 18px",
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
      </main>
    </div>
  );
}
