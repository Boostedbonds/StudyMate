"use client";

import Header from "./Header";

export default function ModeSelector() {
  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      <Header onLogout={() => (window.location.href = "/")} />

      <div style={{ padding: 40, maxWidth: 1200, margin: "0 auto" }}>
        <h1 style={{ textAlign: "center" }}>
          Choose Your Learning Mode
        </h1>

        <p
          style={{
            textAlign: "center",
            color: "#475569",
            marginBottom: 40,
          }}
        >
          Select how you want to study today
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 24,
          }}
        >
          <Card title="Teacher Mode" href="/teacher" color="#2563eb" />
          <Card title="Examiner Mode" href="/examiner" color="#16a34a" />
          <Card title="Oral Mode" href="/oral" color="#9333ea" />
          <Card title="Progress Dashboard" href="/progress" color="#ea580c" />
        </div>
      </div>
    </div>
  );
}

function Card(props: {
  title: string;
  href: string;
  color: string;
}) {
  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: 16,
        padding: 24,
        border: "1px solid #e5e7eb",
      }}
    >
      <h3>{props.title}</h3>

      <a
        href={props.href}
        style={{
          display: "block",
          marginTop: 16,
          padding: 12,
          background: props.color,
          color: "#ffffff",
          borderRadius: 8,
          textAlign: "center",
          textDecoration: "none",
          fontWeight: 600,
        }}
      >
        Start Learning →
      </a>
    </div>
  );
}
