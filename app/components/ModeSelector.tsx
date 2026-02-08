"use client";

import Header from "./Header";

export default function ModeSelector() {
  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      <Header onLogout={() => (window.location.href = "/")} />

      <main
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "56px 24px",
        }}
      >
        <h1
          style={{
            textAlign: "center",
            fontSize: 36,
            marginBottom: 8,
          }}
        >
          Choose Your Learning Mode
        </h1>

        <p
          style={{
            textAlign: "center",
            color: "#475569",
            marginBottom: 44,
          }}
        >
          Select how you want to study today
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 28,
          }}
        >
          <ModeCard
            title="Teacher Mode"
            desc="Learn concepts with clear NCERT-aligned explanations and examples."
            color="#2563eb"
            href="/teacher"
          />

          <ModeCard
            title="Examiner Mode"
            desc="Practice full-length question papers with evaluation and feedback."
            color="#16a34a"
            href="/examiner"
          />

          <ModeCard
            title="Oral Mode"
            desc="Strengthen recall and confidence with spoken question practice."
            color="#9333ea"
            href="/oral"
          />

          <ModeCard
            title="Progress Dashboard"
            desc="Track performance, strengths, weaknesses, and improvements."
            color="#ea580c"
            href="/progress"
          />
        </div>
      </main>
    </div>
  );
}

function ModeCard(props: {
  title: string;
  desc: string;
  color: string;
  href: string;
}) {
  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: 18,
        padding: "26px 24px",
        border: "1px solid #e5e7eb",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        minHeight: 210,
      }}
    >
      <div>
        <h3 style={{ marginBottom: 10 }}>{props.title}</h3>
        <p style={{ color: "#475569", fontSize: 14, lineHeight: 1.5 }}>
          {props.desc}
        </p>
      </div>

      <a
        href={props.href}
        style={{
          marginTop: 22,
          padding: "12px",
          background: props.color,
          color: "#ffffff",
          borderRadius: 10,
          textDecoration: "none",
          textAlign: "center",
          fontWeight: 600,
        }}
      >
        Start Learning →
      </a>
    </div>
  );
}
