"use client";

import { useEffect, useState } from "react";
import Header from "./Header";
import { Orbitron } from "next/font/google";

const orbitron = Orbitron({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

type StudentContext = {
  name: string;
  class: string;
  board: string;
};

export default function ModeSelector() {
  const [student, setStudent] = useState<StudentContext | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("shauri_student");
      if (!raw) {
        window.location.href = "/";
        return;
      }

      const parsed = JSON.parse(raw);
      if (!parsed?.name || !parsed?.class) {
        window.location.href = "/";
        return;
      }

      setStudent(parsed);
    } catch {
      window.location.href = "/";
    }
  }, []);

  if (!student) return null;

  return (
    <div
      className={orbitron.className}
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(to bottom, #FFF3D9 0%, #FFE4B3 35%, #E6F2FF 70%, #F8FAFC 100%)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header — untouched backend */}
      <Header onLogout={() => (window.location.href = "/")} />

      <main
        style={{
          flex: 1,
          maxWidth: 1400,
          margin: "0 auto",
          padding: "40px 32px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* About */}
        <div style={{ marginBottom: 20 }}>
          <a
            href="/about"
            style={{
              fontSize: 12,
              letterSpacing: "0.22em",
              color: "#64748b",
              textDecoration: "none",
            }}
          >
            ABOUT SHAURI
          </a>
        </div>

        {/* Welcome */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <h1
            style={{
              fontSize: 32,
              letterSpacing: "0.18em",
              marginBottom: 10,
              color: "#0f172a",
              fontWeight: 600,
            }}
          >
            WELCOME, {student.name.toUpperCase()}
          </h1>

          <p
            style={{
              color: "#64748b",
              fontSize: 13,
              letterSpacing: "0.20em",
            }}
          >
            CLASS {student.class} • {student.board}
          </p>
        </div>

        {/* Section Title */}
        <h2
          style={{
            textAlign: "center",
            fontSize: 22,
            letterSpacing: "0.28em",
            marginBottom: 10,
            color: "#0f172a",
          }}
        >
          CHOOSE YOUR LEARNING MODE
        </h2>

        <p
          style={{
            textAlign: "center",
            color: "#64748b",
            marginBottom: 48,
            fontSize: 12,
            letterSpacing: "0.18em",
          }}
        >
          SELECT HOW YOU WANT TO STUDY TODAY
        </p>

        {/* Modes Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 36,
          }}
        >
          <ModeCard
            icon="👩‍🏫"
            title="TEACHER MODE"
            desc="Learn concepts with clear CBSE-aligned explanations and examples."
            href="/teacher"
            cta="BEGIN LEARNING"
          />

          <ModeCard
            icon="🧪"
            title="EXAMINER MODE"
            desc="Practice full-length question papers in exam conditions."
            href="/examiner"
            cta="BEGIN TEST"
          />

          <ModeCard
            icon="🗣️"
            title="ORAL MODE"
            desc="Improve recall and confidence through spoken practice."
            href="/oral"
            cta="BEGIN SPEAKING"
          />

          <ModeCard
            icon="📊"
            title="PROGRESS DASHBOARD"
            desc="Review performance, strengths, and areas to improve."
            href="/progress"
            cta="VIEW PROGRESS"
          />
        </div>

        {/* Privacy */}
        <p
          style={{
            marginTop: 60,
            textAlign: "center",
            fontSize: 11,
            color: "#64748b",
            lineHeight: 1.8,
            letterSpacing: "0.12em",
            maxWidth: 700,
            marginInline: "auto",
          }}
        >
          YOUR LEARNING DATA STAYS ON THIS DEVICE. SHAURI DOES NOT TRACK,
          STORE, OR IDENTIFY YOU. ALL PROGRESS REMAINS PRIVATE AND UNDER
          YOUR CONTROL.
        </p>
      </main>
    </div>
  );
}

function ModeCard(props: {
  icon: string;
  title: string;
  desc: string;
  href: string;
  cta: string;
}) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.55)",
        backdropFilter: "blur(10px)",
        borderRadius: 20,
        padding: "34px 28px",
        border: "1px solid rgba(212,175,55,0.25)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        minHeight: 320,
        transition: "0.3s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.border = "1px solid #D4AF37";
        e.currentTarget.style.transform = "translateY(-6px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.border =
          "1px solid rgba(212,175,55,0.25)";
        e.currentTarget.style.transform = "translateY(0px)";
      }}
    >
      <div>
        <div style={{ fontSize: 42, marginBottom: 18 }}>
          {props.icon}
        </div>

        <h3
          style={{
            marginBottom: 16,
            fontSize: 15,
            letterSpacing: "0.25em",
            color: "#D4AF37",
          }}
        >
          {props.title}
        </h3>

        <p
          style={{
            color: "#475569",
            fontSize: 13,
            lineHeight: 1.7,
            letterSpacing: "0.10em",
          }}
        >
          {props.desc}
        </p>
      </div>

      <a
        href={props.href}
        style={{
          marginTop: 28,
          padding: "12px",
          border: "1px solid #D4AF37",
          color: "#0f172a",
          borderRadius: 999,
          textDecoration: "none",
          textAlign: "center",
          fontSize: 12,
          letterSpacing: "0.25em",
        }}
      >
        {props.cta}
      </a>
    </div>
  );
}
