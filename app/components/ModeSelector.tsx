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
          "linear-gradient(to bottom, #FFF3D9 0%, #FFE4B3 45%, #E6F2FF 100%)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* HEADER (UNCHANGED LOGIC) */}
      <Header onLogout={() => (window.location.href = "/")} />

      <main
        style={{
          flex: 1,
          maxWidth: 1400,
          margin: "0 auto",
          padding: "40px 32px 60px 32px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* ABOUT LEFT */}
        <div style={{ marginBottom: 28 }}>
          <a
            href="/about"
            style={{
              fontSize: 13,
              letterSpacing: "0.18em",
              color: "#5c6f82",
              textDecoration: "none",
            }}
          >
            ABOUT SHAURI
          </a>
        </div>

        {/* WELCOME */}
        <div style={{ textAlign: "center", marginBottom: 34 }}>
          <h1
            style={{
              fontSize: 42,
              letterSpacing: "0.22em",
              color: "#0a2540",
              marginBottom: 10,
              fontWeight: 600,
            }}
          >
            WELCOME, {student.name.toUpperCase()}
          </h1>

          <p
            style={{
              fontSize: 14,
              letterSpacing: "0.22em",
              color: "#5c6f82",
            }}
          >
            CLASS {student.class} · {student.board}
          </p>
        </div>

        {/* MAIN HEADER */}
        <h2
          style={{
            textAlign: "center",
            fontSize: 30,
            letterSpacing: "0.28em",
            color: "#0a2540",
            marginBottom: 10,
          }}
        >
          CHOOSE YOUR LEARNING MODE
        </h2>

        {/* SUB HEADER UPDATED */}
        <p
          style={{
            textAlign: "center",
            fontSize: 14,
            letterSpacing: "0.18em",
            color: "#5c6f82",
            marginBottom: 44,
          }}
        >
          SELECT YOUR PATH TO BEGIN THE ASCENT
        </p>

        {/* CARDS — FORCED SINGLE ROW */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 28,
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
            desc="Practice full-length question papers in real exam conditions."
            href="/examiner"
            cta="BEGIN TEST"
          />

          <ModeCard
            icon="🗣️"
            title="ORAL MODE"
            desc="Strengthen recall, fluency, and spoken confidence."
            href="/oral"
            cta="BEGIN SPEAKING"
          />

          <ModeCard
            icon="📊"
            title="PROGRESS DASHBOARD"
            desc="Review strengths, identify gaps, and track your growth."
            href="/progress"
            cta="VIEW PROGRESS"
          />
        </div>

        {/* PRIVACY */}
        <p
          style={{
            marginTop: 54,
            textAlign: "center",
            fontSize: 12,
            letterSpacing: "0.05em",
            color: "#6b7c8f",
            lineHeight: 1.6,
          }}
        >
          Your learning data remains private and stays on this device unless you
          explicitly export or share it.
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
        borderRadius: 22,
        padding: "30px 26px",
        border: "1px solid rgba(212,175,55,0.35)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        minHeight: 280,
      }}
    >
      <div>
        <div style={{ fontSize: 40, marginBottom: 16 }}>
          {props.icon}
        </div>

        <h3
          style={{
            fontSize: 16,
            letterSpacing: "0.18em",
            color: "#D4AF37",
            marginBottom: 12,
          }}
        >
          {props.title}
        </h3>

        <p
          style={{
            fontSize: 14,
            color: "#425466",
            lineHeight: 1.6,
          }}
        >
          {props.desc}
        </p>
      </div>

      <a
        href={props.href}
        style={{
          marginTop: 26,
          padding: "12px",
          borderRadius: 999,
          border: "1px solid #D4AF37",
          color: "#0a2540",
          textAlign: "center",
          textDecoration: "none",
          fontSize: 13,
          letterSpacing: "0.18em",
        }}
      >
        {props.cta}
      </a>
    </div>
  );
}
