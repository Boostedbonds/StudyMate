"use client";

import Header from "../components/Header";

export default function ProgressPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      <Header onLogout={() => (window.location.href = "/")} />

      <main style={{ padding: 40, maxWidth: 900, margin: "0 auto" }}>
        <h1>Progress Dashboard</h1>
        <p style={{ color: "#475569" }}>
          Progress data will appear here.
        </p>
      </main>
    </div>
  );
}
