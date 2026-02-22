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
    if (code !== ACCESS_CODE) return setError("Invalid access code");

    const student = {
      name: name.trim(),
      class: studentClass,
      board: "CBSE",
    };

    localStorage.setItem("shauri_student", JSON.stringify(student));
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
                top: "28%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: "520px",
                height: "520px",
                borderRadius: "50%",
                background:
                  "radial-gradient(circle, rgba(255,215,120,0.95) 0%, rgba(255,160,40,0.5) 50%, transparent 80%)",
                filter: "blur(10px)",
              }}
            />

            {/* TITLE */}
            <div
              style={{
                position: "absolute",
                top: "28%",
                width: "100%",
                textAlign: "center",
                zIndex: 5,
              }}
            >
              <h1
                style={{
                  fontSize: "72px",
                  letterSpacing: "0.5em",
                  fontWeight: 700,
                  color: "#FFD700",
                  textShadow:
                    "0 0 25px rgba(255,215,120,0.9), 0 0 60px rgba(255,215,120,0.6)",
                }}
              >
                SHAURI
              </h1>

              <p style={{ color: "#ffffff", marginTop: 10 }}>
                THE COURAGE TO MASTER THE FUTURE
              </p>

              <p style={{ color: "#FFD700" }}>
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

            {/* CTA (FIXED ABOVE PEAK) */}
            <motion.div
              onClick={handleEnter}
              style={{
                position: "absolute",
                bottom: "42%",
                left: "50%",
                transform: "translateX(-50%)",
                padding: "14px 36px",
                borderRadius: "999px",
                border: "1px solid rgba(255,215,0,0.6)",
                color: "#FFD700",
                letterSpacing: "0.3em",
                cursor: "pointer",
                overflow: "hidden",
              }}
            >
              {/* running golden light */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: "-50%",
                  width: "50%",
                  height: "100%",
                  background:
                    "linear-gradient(120deg, transparent, rgba(255,215,0,0.8), transparent)",
                  animation: "run 2s linear infinite",
                }}
              />

              BEGIN THE ASCENT
            </motion.div>

            <style>
              {`
              @keyframes run {
                0% { left: -50%; }
                100% { left: 120%; }
              }
              `}
            </style>

            {warp && (
              <motion.div
                style={{ position: "absolute", inset: 0, background: "white" }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================= ACCESS ================= */}
      {entered && (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            background: "#d8c8a4",
          }}
        >
          <h1
            style={{
              fontSize: "52px",
              letterSpacing: "0.45em",
              marginBottom: 12,
              color: "#0a2540",
            }}
          >
            SHAURI
          </h1>

          <p style={{ marginBottom: 30 }}>
            CBSE-Aligned. Adaptive. Built for your growth.
          </p>

          <form
            onSubmit={handleSubmit}
            style={{
              display: "grid",
              gap: 18,
              width: "320px",
            }}
          >
            <input
              placeholder="Student Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
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
              placeholder="Access Code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              style={inputStyle}
            />

            <button style={ctaStyle}>
              INITIATE ASCENT
            </button>
          </form>

          <p style={{ marginTop: 40, opacity: 0.7 }}>
            Discipline today builds the confidence of tomorrow.
          </p>
        </div>
      )}
    </div>
  );
}

const inputStyle = {
  padding: "12px",
  borderRadius: "10px",
  border: "1px solid #ccc",
  width: "100%",
};

const ctaStyle = {
  padding: "14px",
  borderRadius: "999px",
  border: "none",
  background: "linear-gradient(to right, #FFD700, #d4af37)",
  letterSpacing: "0.15em",
  fontWeight: 600,
};