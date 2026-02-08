"use client";

import { useState } from "react";
import ModeSelector from "./components/ModeSelector";

const PARENT_CODE = "0330";

export default function HomePage() {
  const [code, setCode] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (code === PARENT_CODE) {
      setAuthorized(true);
      setError("");
    } else {
      setError("Invalid access code");
    }
  }

  if (!authorized) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "linear-gradient(135deg,#1e3a8a,#059669)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <form
          onSubmit={handleSubmit}
          style={{
            background: "#ffffff",
            padding: "48px 42px",
            borderRadius: 18,
            width: 420,
            textAlign: "center",
          }}
        >
          <h1 style={{ fontSize: 34, marginBottom: 8 }}>StudyMate</h1>
          <p style={{ marginBottom: 28 }}>
            CBSE Class 9 Learning Platform
          </p>

          <div
            style={{
              background: "#eef2ff",
              padding: 14,
              borderRadius: 10,
              marginBottom: 22,
              fontWeight: 600,
            }}
          >
            Parent Access Control
          </div>

          <input
            type="password"
            placeholder="Access Code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            style={{
              width: "100%",
              padding: 14,
              fontSize: 16,
              marginBottom: 14,
              borderRadius: 10,
              border: "1px solid #cbd5f5",
            }}
          />

          {error && (
            <div style={{ color: "red", marginBottom: 12 }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            style={{
              width: "100%",
              padding: 14,
              background: "#1e3a8a",
              color: "#ffffff",
              borderRadius: 10,
              border: "none",
              fontSize: 16,
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
              borderRadius: 10,
              fontSize: 13,
            }}
          >
            This platform requires parent authorization for access.
          </div>
        </form>
      </div>
    );
  }

  return <ModeSelector />;
}
