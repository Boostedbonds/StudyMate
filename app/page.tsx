"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Orbitron } from "next/font/google";

const orbitron = Orbitron({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const ACCESS_CODE = "0330";

export default function HomePage() {
  const [entered, setEntered] = useState(false);

  const [name, setName] = useState("");
  const [studentClass, setStudentClass] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  function handleEnter() {
    setEntered(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!name.trim()) return setError("Enter name");
    if (!studentClass) return setError("Select class");
    if (code !== ACCESS_CODE) return setError("Invalid code");

    localStorage.setItem(
      "shauri_student",
      JSON.stringify({ name, class: studentClass, board: "CBSE" })
    );

    window.location.href = "/modes";
  }

  return (
    <div className={orbitron.className} style={{ minHeight: "100vh" }}>

      {/* ================= LANDING ================= */}
      <AnimatePresence>
        {!entered && (
          <motion.div
            style={{
              position: "fixed",
              inset: 0,
              background: "linear-gradient(to top, #000814, #001d3d, #0a2540)",
            }}
          >
            {/* SUN */}
            <div
              style={{
                position: "absolute",
                top: "22%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: 520,
                height: 520,
                borderRadius: "50%",
                background:
                  "radial-gradient(circle, rgba(255,215,120,0.95) 0%, rgba(255,160,40,0.5) 50%, transparent 80%)",
                filter: "blur(8px)",
              }}
            />

            {/* TITLE */}
            <div style={{ textAlign: "center", marginTop: "18%" }}>
              <h1
                style={{
                  fontSize: "72px",
                  letterSpacing: "0.6em",
                  color: "#FFD700",
                  textShadow:
                    "0 0 25px rgba(255,215,120,0.8), 0 0 50px rgba(255,200,80,0.5)",
                }}
              >
                SHAURI
              </h1>

              <p style={{ color: "#fff", marginTop: 10 }}>
                THE COURAGE TO MASTER THE FUTURE
              </p>

              <p style={{ color: "#FFD700" }}>
                CBSE-ALIGNED ADAPTIVE LEARNING PLATFORM
              </p>
            </div>

            {/* CTA */}
            <div
              onClick={handleEnter}
              style={{
                position: "absolute",
                bottom: "28%", // ✅ above peak
                left: "50%",
                transform: "translateX(-50%)",
                padding: "14px 34px",
                borderRadius: "999px",
                border: "1px solid rgba(255,215,0,0.6)",
                color: "#FFD700",
                letterSpacing: "0.3em",
                cursor: "pointer",
                overflow: "hidden",
              }}
            >
              {/* running light */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: "999px",
                  background:
                    "linear-gradient(120deg, transparent, rgba(255,215,0,0.6), transparent)",
                  animation: "run 2.5s linear infinite",
                }}
              />

              <span style={{ position: "relative" }}>
                BEGIN THE ASCENT
              </span>
            </div>

            {/* MOUNTAIN */}
            <svg viewBox="0 0 1440 800" style={{ position: "absolute", bottom: 0 }}>
              <path
                d="M0,730 C400,650 700,600 720,500 C740,600 1000,650 1440,720 L1440,800 L0,800 Z"
                fill="black"
              />
            </svg>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================= ACCESS ================= */}
      {entered && (
        <div
          style={{
            minHeight: "100vh",
            background: "linear-gradient(to bottom, #e6d3a3, #d4c08f)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <h1
            style={{
              fontSize: "44px",
              letterSpacing: "0.5em",
              color: "#0f172a",
            }}
          >
            SHAURI
          </h1>

          <p style={{ marginTop: 12, marginBottom: 28 }}>
            CBSE-Aligned. Adaptive. Built for your growth.
          </p>

          <form
            onSubmit={handleSubmit}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 16,
              width: 320,
            }}
          >
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Student Name"
              style={input}
            />

            <select
              value={studentClass}
              onChange={(e) => setStudentClass(e.target.value)}
              style={input}
            >
              <option value="">Select Class</option>
              {[6,7,8,9,10,11,12].map(c => (
                <option key={c}>Class {c}</option>
              ))}
            </select>

            <input
              type="password"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Access Code"
              style={input}
            />

            <button
              style={{
                padding: "14px",
                borderRadius: "999px",
                border: "none",
                background: "linear-gradient(90deg, #FFD700, #D4AF37)",
                fontWeight: 600,
                letterSpacing: "0.1em",
                cursor: "pointer",
              }}
            >
              INITIATE ASCENT
            </button>
          </form>

          <p style={{ marginTop: 28 }}>
            Discipline today builds the confidence of tomorrow.
          </p>
        </div>
      )}

      <style jsx>{`
        @keyframes run {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}

const input = {
  padding: "12px",
  borderRadius: "10px",
  border: "1px solid #ccc",
  width: "100%",
};