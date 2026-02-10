"use client";

import { useState } from "react";
import ModeSelector from "./components/ModeSelector";

const PARENT_CODE = "0330";

export default function HomePage() {
  const [name, setName] = useState("");
  const [studentClass, setStudentClass] = useState("");
  const [code, setCode] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!name.trim()) {
      setError("Please enter student name");
      return;
    }

    if (!studentClass) {
      setError("Please select class");
      return;
    }

    if (code !== PARENT_CODE) {
      setError("Invalid access code");
      return;
    }

    // ✅ Save student context
    localStorage.setItem(
      "studymate_student",
      JSON.stringify({
        name: name.trim(),
        class: studentClass,
        board: "CBSE",
      })
    );

    setAuthorized(true);
    setError("");
  }

  if (!authorized) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background:
            "linear-gradient(135deg, #e0f2fe 0%, #bae6fd 40%, #c7d2fe 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <form
          onSubmit={handleSubmit}
          style={{
            background: "#ffffff",
            padding: "52px 46px",
            borderRadius: 20,
            width: 460,
            textAlign: "center",
            boxShadow: "0 20px 40px rgba(0,0,0,0.08)",
          }}
        >
          <h1 style={{ fontSize: 36, marginBottom: 6 }}>StudyMate</h1>
          <p style={{ marginBottom: 28, color: "#475569" }}>
            CBSE Learning Platform
          </p>

          <div
            style={{
              background: "#eef2ff",
              padding: 14,
              borderRadius: 12,
              marginBottom: 24,
              fontWeight: 600,
            }}
          >
            Access Control
          </div>

          {/* Student Name */}
          <input
            type="text"
            placeholder="Student Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{
              width: "100%",
              padding: 14,
              fontSize: 16,
              marginBottom: 14,
              borderRadius: 12,
              border: "1px solid #cbd5f5",
              textAlign: "center",
            }}
          />

          {/* Class Selector */}
          <select
            value={studentClass}
            onChange={(e) => setStudentClass(e.target.value)}
            style={{
              width: "100%",
              padding: 14,
              fontSize: 16,
              marginBottom: 14,
              borderRadius: 12,
              border: "1px solid #cbd5f5",
              textAlign: "center",
            }}
          >
            <option value="">Select Class</option>
            <option value="6">Class 6</option>
            <option value="7">Class 7</option>
            <option value="8">Class 8</option>
            <option value="9">Class 9</option>
            <option value="10">Class 10</option>
          </select>

          {/* Parent Code */}
          <input
            type="password"
            placeholder="Parent Access Code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            style={{
              width: "100%",
              padding: 14,
              fontSize: 16,
              marginBottom: 14,
              borderRadius: 12,
              border: "1px solid #cbd5f5",
              textAlign: "center",
            }}
          />

          {error && (
            <div style={{ color: "#dc2626", marginBottom: 14 }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            style={{
              width: "100%",
              padding: 16,
              background: "#2563eb",
              color: "#ffffff",
              borderRadius: 12,
              border: "none",
              fontSize: 18,
              cursor: "pointer",
            }}
          >
            Enter StudyMate
          </button>

          <div
            style={{
              marginTop: 26,
              background: "#fef9c3",
              padding: 14,
              borderRadius: 12,
              fontSize: 13,
            }}
          >
            Parent authorization is required to access this platform.
          </div>
        </form>
      </div>
    );
  }

  return <ModeSelector />;
}
