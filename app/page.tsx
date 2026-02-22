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

      {/* LANDING */}
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
                top: "20%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: "560px",
                height: "560px",
                borderRadius: "50%",
                background:
                  "radial-gradient(circle, rgba(255,215,120,1) 0%, rgba(255,170,60,0.6) 45%, transparent 75%)",
                filter: "blur(12px)",
              }}
            />

            {/* TITLE */}
            <div style={{ position: "absolute", top: "20%", width: "100%", textAlign: "center", zIndex: 5 }}>
              <h1
                style={{
                  fontSize: "84px",
                  letterSpacing: "0.45em",
                  fontWeight: 700,
                  background: "linear-gradient(to bottom, #FFD700, #FDE68A, #D4AF37)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  textShadow:
                    "0 0 25px rgba(255,215,120,0.9), 0 0 60px rgba(255,200,80,0.5)",
                }}
              >
                SHAURI
              </h1>

              <p style={{ marginTop: 12, color: "#e5e7eb" }}>
                THE COURAGE TO MASTER THE FUTURE
              </p>

              <p style={{ color: "#FFD700" }}>
                CBSE-ALIGNED ADAPTIVE LEARNING PLATFORM
              </p>
            </div>

            {/* MOUNTAIN */}
            <svg viewBox="0 0 1440 800" style={{ position: "absolute", bottom: 0 }}>
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
                bottom: "24%",
                left: "50%",
                transform: "translateX(-50%)",
                cursor: "pointer",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  position: "relative",
                  padding: "14px 28px",
                  borderRadius: "999px",
                  color: "#FFD700",
                  letterSpacing: "0.35em",
                  overflow: "hidden",
                }}
              >
                {/* Running golden border */}
                <motion.div
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: "999px",
                    border: "1px solid rgba(255,215,0,0.6)",
                  }}
                />

                <motion.div
                  style={{
                    position: "absolute",
                    width: "40%",
                    height: "100%",
                    top: 0,
                    left: "-40%",
                    background:
                      "linear-gradient(90deg, transparent, rgba(255,215,0,0.8), transparent)",
                  }}
                  animate={{ left: ["-40%", "140%"] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                />

                <div style={{ position: "relative", zIndex: 2 }}>
                  BEGIN THE ASCEND
                </div>
              </div>

              <div style={{ fontSize: "12px", marginTop: 8, color: "#cbd5f5" }}>
                {getDynamicLine()}
              </div>
            </motion.div>

            {warp && (
              <motion.div
                style={{ position: "absolute", inset: 0, background: "#e7d3a3" }}
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
            background: "linear-gradient(to bottom, #f5e6c4, #e7d3a3)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            flexDirection: "column",
          }}
        >
          <h1 style={{ marginBottom: 30 }}>SHAURI</h1>

          <form
            onSubmit={handleSubmit}
            style={{
              display: "grid",
              gap: 16,
              width: "300px",
            }}
          >
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Student Name" style={inputStyle}/>
            <select value={studentClass} onChange={(e) => setStudentClass(e.target.value)} style={inputStyle}>
              <option value="">Select Class</option>
              {[6,7,8,9,10,11,12].map(c => <option key={c}>Class {c}</option>)}
            </select>
            <input type="password" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Access Code" style={inputStyle}/>
            <button style={buttonStyle}>STEP IN</button>
          </form>

          {error && <p style={{ color: "red", marginTop: 10 }}>{error}</p>}

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
  borderRadius: "12px",
  border: "1px solid #D4AF37",
  background: "#ffffff",
};

const buttonStyle = {
  padding: "12px",
  borderRadius: "999px",
  border: "1px solid #D4AF37",
  background: "#f5e6c4",
  cursor: "pointer",
};