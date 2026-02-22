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
  const [warp, setWarp] = useState(false);

  const [name, setName] = useState("");
  const [studentClass, setStudentClass] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  function handleEnter() {
    setWarp(true);
    setTimeout(() => setEntered(true), 900);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!name.trim()) return setError("Enter student name");
    if (!studentClass) return setError("Select class");
    if (code !== ACCESS_CODE) return setError("Invalid code");

    const studentContext = {
      name: name.trim(),
      class: studentClass,
      board: "CBSE",
    };

    localStorage.setItem("shauri_student", JSON.stringify(studentContext));

    document.cookie = `shauri_name=${encodeURIComponent(studentContext.name)}; path=/`;
    document.cookie = `shauri_class=${encodeURIComponent(studentContext.class)}; path=/`;

    window.location.href = "/modes";
  }

  return (
    <div className={orbitron.className} style={{ minHeight: "100vh" }}>
      {/* ---------------- LANDING ---------------- */}
      <AnimatePresence>
        {!entered && (
          <motion.div
            style={{
              position: "fixed",
              inset: 0,
              background: "linear-gradient(to top, #000814, #001d3d, #0a2540)",
              overflow: "hidden",
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* SUN */}
            <div
              style={{
                position: "absolute",
                top: "22%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: "520px",
                height: "520px",
                borderRadius: "50%",
                background:
                  "radial-gradient(circle, rgba(255,215,120,0.95) 0%, rgba(255,160,40,0.5) 50%, transparent 80%)",
                filter: "blur(12px)",
              }}
            />

            {/* TITLE */}
            <div
              style={{
                position: "absolute",
                top: "22%",
                width: "100%",
                textAlign: "center",
                zIndex: 5,
              }}
            >
              <h1
                style={{
                  fontSize: "72px",
                  letterSpacing: "0.6em",
                  fontWeight: 700,
                  color: "#FFD700",
                  textShadow:
                    "0 0 25px rgba(255,215,120,0.8), 0 0 60px rgba(255,215,120,0.4)",
                }}
              >
                SHAURI
              </h1>

              <p style={{ marginTop: 12, color: "#e2e8f0" }}>
                THE COURAGE TO MASTER THE FUTURE
              </p>

              <p style={{ color: "#FFD700", marginTop: 6 }}>
                CBSE-ALIGNED ADAPTIVE LEARNING PLATFORM
              </p>
            </div>

            {/* MOUNTAIN */}
            <svg
              viewBox="0 0 1440 800"
              style={{ position: "absolute", bottom: 0 }}
            >
              <path
                d="M0,730 C400,650 700,600 720,500 C740,600 1000,650 1440,720 L1440,800 L0,800 Z"
                fill="black"
              />
            </svg>

            {/* CTA */}
            <motion.div
              onClick={handleEnter}
              style={{
                position: "absolute",
                bottom: "200px",
                left: "50%",
                transform: "translateX(-50%)",
                cursor: "pointer",
                padding: "14px 36px",
                borderRadius: "999px",
                border: "1px solid rgba(255,215,0,0.6)",
                color: "#FFD700",
                letterSpacing: "0.3em",
                fontSize: "14px",
                backdropFilter: "blur(6px)",
              }}
              whileHover={{
                scale: 1.05,
                boxShadow: "0 0 25px rgba(255,215,0,0.6)",
              }}
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              BEGIN THE ASCENT
            </motion.div>

            {warp && (
              <motion.div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "#f5e6c4",
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---------------- ACCESS PAGE ---------------- */}
      {entered && (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            flexDirection: "column",
            background: "linear-gradient(to bottom, #e6d3a3, #d9c28f)",
          }}
        >
          {/* TITLE */}
          <h1
            style={{
              fontSize: "48px",
              letterSpacing: "0.5em",
              marginBottom: 20,
              color: "#0f172a",
            }}
          >
            SHAURI
          </h1>

          {/* SUBTITLE */}
          <p style={{ marginBottom: 30, color: "#334155" }}>
            CBSE-Aligned. Adaptive. Built for your growth.
          </p>

          {/* FORM */}
          <form
            onSubmit={handleSubmit}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 18,
              alignItems: "center",
            }}
          >
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Student Name"
              style={inputStyle}
            />

            <select
              value={studentClass}
              onChange={(e) => setStudentClass(e.target.value)}
              style={inputStyle}
            >
              <option value="">Select Class</option>
              {[6, 7, 8, 9, 10, 11, 12].map((c) => (
                <option key={c}>Class {c}</option>
              ))}
            </select>

            <input
              type="password"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Access Code"
              style={inputStyle}
            />

            {/* CTA */}
            <button type="submit" style={ctaStyle}>
              INITIATE ASCENT
            </button>

            {error && (
              <p style={{ color: "red", fontSize: 12 }}>{error}</p>
            )}
          </form>

          {/* QUOTE */}
          <p style={{ marginTop: 40, color: "#475569" }}>
            Discipline today builds the confidence of tomorrow.
          </p>
        </div>
      )}
    </div>
  );
}

const inputStyle = {
  width: "320px",
  padding: "12px",
  borderRadius: "12px",
  border: "1px solid #d4af37",
  background: "#f8fafc",
};

const ctaStyle = {
  width: "320px",
  padding: "14px",
  borderRadius: "999px",
  border: "1px solid #d4af37",
  background: "linear-gradient(to right, #f5d98c, #d4af37)",
  fontWeight: 600,
  letterSpacing: "0.15em",
  cursor: "pointer",
};