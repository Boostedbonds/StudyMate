"use client";

import Header from "../components/Header";

export default function ProgressPage() {
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

      <main
        style={{
          flex: 1,
          padding: "48px 32px",
          maxWidth: 1000,
          margin: "0 auto",
        }}
      >
        {/* 🔙 Back Button — locked base UI style */}
        <div style={{ marginBottom: 24 }}>
          <button
            onClick={() => (window.location.href = "/")}
            style={{
              padding: "10px 16px",
              background: "#2563eb",
              color: "#ffffff",
              borderRadius: 12,
              border: "none",
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            ← Back
          </button>
        </div>

        <h1
          style={{
            fontSize: 36,
            marginBottom: 12,
          }}
        >
          Progress Dashboard
        </h1>

        <p
          style={{
            color: "#475569",
            fontSize: 18,
            marginBottom: 32,
          }}
        >
          Your learning progress, strengths, and improvement areas will appear here.
        </p>

        <div
          style={{
            background: "#ffffff",
            borderRadius: 20,
            padding: "48px 40px",
            boxShadow: "0 20px 40px rgba(0,0,0,0.08)",
            textAlign: "center",
            color: "#64748b",
            fontSize: 16,
          }}
        >
          📊 Progress tracking will be available soon.
        </div>
      </main>
    </div>
  );
}
