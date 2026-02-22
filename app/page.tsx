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
            {/* SUN (animated pulse) */}
            <motion.div
              animate={{
                scale: [1, 1.05, 1],
                opacity: [0.9, 1, 0.9],
              }}
              transition={{ duration: 4, repeat: Infinity }}
              style={{
                position: "absolute",
                top: "22%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: "420px",
                height: "420px",
                borderRadius: "50%",
                background:
                  "radial-gradient(circle, rgba(255,215,120,0.95) 0%, rgba(255,170,60,0.4) 55%, transparent 75%)",
                filter: "blur(4px)",
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
                  letterSpacing: "0.5em",
                  fontWeight: 700,
                  background:
                    "linear-gradient(to bottom, #FFD700, #E6C200, #A67C00)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  textShadow:
                    "0 0 10px rgba(255,215,120,0.7), 0 0 25px rgba(255,200,80,0.5), 0 2px 4px rgba(0,0,0,0.7)",
                }}
              >
                SHAURI
              </h1>

              <p style={{ marginTop: 12, color: "#fff", letterSpacing: "0.1em" }}>
                THE COURAGE TO MASTER THE FUTURE
              </p>

              <p style={{ color: "#FFD700", marginTop: 4 }}>
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
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              style={{
                position: "absolute",
                bottom: "40%",
                left: "50%",
                transform: "translateX(-50%)",
                letterSpacing: "0.4em",
                color: "#FFD700",
                cursor: "pointer",
                textAlign: "center",
              }}
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              BEGIN THE ASCENT
              <div style={{ fontSize: "12px", marginTop: 10 }}>
                {getDynamicLine()}
              </div>
            </motion.div>

            {/* DAWN TRANSITION */}
            {warp && (
              <motion.div
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                style={{
                  transformOrigin: "bottom",
                  position: "absolute",
                  inset: 0,
                  background:
                    "linear-gradient(to bottom, #fff7e6, #f3e2b3, #e6d3a3)",
                }}
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
            background:
              "linear-gradient(to bottom, #fff7e6, #f3e2b3, #e6d3a3)",
          }}
        >
          <h1 style={{ fontSize: 40, marginBottom: 30 }}>SHAURI</h1>

          <form
            onSubmit={handleSubmit}
            style={{
              display: "grid",
              gap: 18,
              width: "100%",
              maxWidth: "340px",
              backdropFilter: "blur(6px)",
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

            {error && (
              <div style={{ color: "red", fontSize: "13px" }}>{error}</div>
            )}

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={buttonStyle}
            >
              STEP IN
            </motion.button>
          </form>

          {/* STRONG QUOTE */}
          <p
            style={{
              marginTop: "70px",
              fontSize: "14px",
              opacity: 0.8,
              textAlign: "center",
              maxWidth: "400px",
            }}
          >
            Discipline today builds the confidence of tomorrow.
          </p>
        </div>
      )}
    </div>
  );
}

const inputStyle = {
  padding: "14px",
  borderRadius: "14px",
  border: "1px solid #D4AF37",
  fontSize: "14px",
  outline: "none",
  transition: "all 0.2s ease",
};

const buttonStyle = {
  padding: "14px",
  borderRadius: "999px",
  border: "1px solid #D4AF37",
  background: "transparent",
  fontWeight: 600,
  cursor: "pointer",
};