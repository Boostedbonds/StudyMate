"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Orbitron } from "next/font/google";

const orbitron = Orbitron({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const ACCESS_CODE = "0330";

function getDynamicLine() {
  const hour = new Date().getHours();
  if (hour < 5) return "The system is quiet… but listening.";
  if (hour < 12) return "A fresh mind learns faster.";
  if (hour < 17) return "Focus sharpens understanding.";
  if (hour < 22) return "Consistency builds mastery.";
  return "Even now, progress is possible.";
}

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

    if (!name.trim()) return setError("Please enter student name");
    if (!studentClass) return setError("Please select class");
    if (code !== ACCESS_CODE) return setError("Invalid access code");

    const studentContext = {
      name: name.trim(),
      class: studentClass,
      board: "CBSE",
    };

    localStorage.setItem("shauri_student", JSON.stringify(studentContext));

    document.cookie = `shauri_name=${encodeURIComponent(studentContext.name)}; path=/; SameSite=Lax`;
    document.cookie = `shauri_class=${encodeURIComponent(studentContext.class)}; path=/; SameSite=Lax`;

    window.location.href = "/modes";
  }

  return (
    <div className={orbitron.className} style={{ minHeight: "100vh" }}>
      
      {/* HERO */}
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
                  "radial-gradient(circle, rgba(255,215,120,0.95) 0%, rgba(255,160,40,0.6) 40%, rgba(255,160,40,0.2) 65%, transparent 80%)",
                filter: "blur(6px)", // reduced blur for sharper glow
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
                  letterSpacing: "0.45em",
                  fontWeight: 700,
                  color: "#FFD700",
                  textShadow:
                    "0 0 8px rgba(255,215,120,0.8), 0 0 20px rgba(255,200,80,0.6), 0 0 40px rgba(255,180,50,0.4)",
                }}
              >
                SHAURI
              </h1>

              <p style={{ marginTop: 10, color: "#ffffff", letterSpacing: "0.1em" }}>
                THE COURAGE TO MASTER THE FUTURE
              </p>

              <p
                style={{
                  color: "#FFD700",
                  fontSize: "13px",
                  letterSpacing: "0.15em",
                  marginTop: 6,
                  whiteSpace: "nowrap",
                }}
              >
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
                bottom: "200, // 🔥 fixed spacing above peak
                left: "50%",
                transform: "translateX(-50%)",
                letterSpacing: "0.35em",
                color: "#FFD700",
                cursor: "pointer",
                textAlign: "center",
              }}
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <div style={{ fontSize: "16px" }}>
                BEGIN THE ASCENT
              </div>

              <div
                style={{
                  fontSize: "12px",
                  marginTop: 10,
                  opacity: 0.8,
                }}
              >
                {getDynamicLine()}
              </div>
            </motion.div>

            {/* TRANSITION FLASH */}
            {warp && (
              <motion.div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "white",
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ACCESS PAGE */}
      {entered && (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            flexDirection: "column",
            background: "linear-gradient(to bottom, #f5e6c4, #e8d3a3)",
          }}
        >
          <h1 style={{ marginBottom: 24 }}>SHAURI</h1>

          <form
            onSubmit={handleSubmit}
            style={{ display: "grid", gap: 16, width: 260 }}
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

            <button style={buttonStyle}>STEP IN</button>

            {error && (
              <div style={{ color: "red", fontSize: 12 }}>{error}</div>
            )}
          </form>

          <p style={{ marginTop: 40, fontSize: 13, opacity: 0.7 }}>
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
  border: "1px solid #d4af37",
  background: "#fff",
};

const buttonStyle = {
  padding: "12px",
  borderRadius: "999px",
  border: "1px solid #D4AF37",
  background: "transparent",
  cursor: "pointer",
};