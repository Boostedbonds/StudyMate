"use client";

import { useState } from "react";
import ModeSelector from "./components/ModeSelector";

const PARENT_CODE = "0330";

export default function HomePage() {
  const [code, setCode] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [error, setError] = useState("");

  function handleEnter() {
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
        <div
          style={{
            background: "#fff",
            padding: 32,
            borderRadius: 12,
            width: 380,
            textAlign: "center",
          }}
        >
          <h1 style={{ fontSize: 28, marginBottom: 8 }}>StudyMate</h1>
          <p style={{ marginBottom: 20 }}>CBSE Class 9 Learning Platform</p>

          <div
            style={{
              background: "#eef2ff",
              padding: 12,
              borderRadius: 8,
              marginBottom: 12,
              fontWeight: 500,
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
              padding: 10,
              marginBottom: 12,
            }}
          />

          {error && (
            <div style={{ color: "red", marginBottom: 8 }}>{error}</div>
          )}

          <button
            onClick={handleEnter}
            style={{
              width: "100%",
              padding: 12,
              background: "#1e3a8a",
              color: "#fff",
              borderRadius: 8,
              border: "none",
              fontSize: 16,
              cursor: "pointer",
            }}
          >
            Enter StudyMate
          </button>

          <div
            style={{
              marginTop: 16,
              background: "#fef9c3",
              padding: 10,
              borderRadius: 8,
              fontSize: 12,
            }}
          >
            This platform requires parent authorization for access.
          </div>
        </div>
      </div>
    );
  }

  return <ModeSelector />;
}
