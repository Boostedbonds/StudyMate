"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const ACCESS_CODE = "0330";

export default function HomePage() {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [studentClass, setStudentClass] = useState("");
  const [error, setError] = useState("");
  const [entered, setEntered] = useState(false);
  const [warp, setWarp] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (code !== ACCESS_CODE) {
      setError("Invalid access code");
      return;
    }

    if (!name.trim()) {
      setError("Please enter student name");
      return;
    }

    if (!studentClass) {
      setError("Please select class");
      return;
    }

    const studentContext = {
      name: name.trim(),
      class: studentClass,
      board: "CBSE",
    };

    localStorage.setItem("shauri_student", JSON.stringify(studentContext));
    document.cookie = `shauri_name=${encodeURIComponent(studentContext.name)}; path=/; SameSite=Lax`;
    document.cookie = `shauri_class=${encodeURIComponent(studentContext.class)}; path=/; SameSite=Lax`;

    setTimeout(() => {
      window.location.href = "/modes";
    }, 50);
  }

  const handleEnter = () => {
    setWarp(true);
    setTimeout(() => setEntered(true), 900);
  };

  return (
    <>
      {/* ================= INTRO SCREEN ================= */}
      <AnimatePresence>
        {!entered && (
          <motion.div
            style={{
              position: "fixed",
              inset: 0,
              background: "radial-gradient(circle at 50% 35%, #0f2a4a 0%, #071628 55%, #030712 100%)",
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2 }}
            onClick={handleEnter}
          >
            {/* Summit Glow */}
            <motion.div
              style={{
                position: "absolute",
                bottom: "45%",
                left: "50%",
                transform: "translateX(-50%)",
                width: "900px",
                height: "600px",
                background:
                  "radial-gradient(circle at center, rgba(255,210,120,0.35), transparent 70%)",
                filter: "blur(120px)",
              }}
              animate={{ opacity: [0.8, 1, 0.8] }}
              transition={{ duration: 8, repeat: Infinity }}
            />

            {/* Mountain Outline */}
            <svg
              viewBox="0 0 1440 800"
              preserveAspectRatio="none"
              style={{
                position: "absolute",
                bottom: 0,
                width: "100%",
                height: "75%",
              }}
            >
              <path
                d="M0,760 
                   C200,700 400,640 600,620
                   C680,610 700,570 720,520
                   C740,570 760,610 840,630
                   C1040,670 1240,720 1440,760
                   L1440,800 L0,800 Z"
                fill="#000000"
              />

              <path
                d="M500,640 L720,520 L940,650"
                fill="none"
                stroke="#FFD166"
                strokeWidth="3"
                strokeLinejoin="round"
                style={{
                  filter: "drop-shadow(0 0 8px rgba(255,209,102,0.8))",
                }}
              />
            </svg>

            {/* Brand */}
            <motion.div
              style={{ textAlign: "center", position: "relative", zIndex: 2 }}
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 1.6 }}
            >
              <h1
                style={{
                  fontSize: "70px",
                  letterSpacing: "0.45em",
                  fontWeight: 700,
                  color: "#FFD166",
                }}
              >
                SHAURI
              </h1>

              <p
                style={{
                  marginTop: 24,
                  fontSize: "14px",
                  letterSpacing: "0.25em",
                  color: "#cbd5e1",
                }}
              >
                Aligned. Adaptive. Guiding Excellence.
              </p>

              <motion.p
                style={{
                  marginTop: 30,
                  fontSize: "12px",
                  letterSpacing: "0.35em",
                  color: "#FFD166",
                }}
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                BEGIN ASCENT
              </motion.p>
            </motion.div>

            {warp && (
              <motion.div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "white",
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.9 }}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================= ACCESS PAGE ================= */}
      {entered && (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background:
              "linear-gradient(to bottom, #fdf6e3 0%, #eef2ff 50%, #f8fafc 100%)",
            padding: "40px 20px",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: 50 }}>
            <h1
              style={{
                fontSize: "44px",
                letterSpacing: "0.3em",
                fontWeight: 700,
                color: "#0f172a",
              }}
            >
              SHAURI
            </h1>

            <p
              style={{
                marginTop: 14,
                fontSize: "14px",
                letterSpacing: "0.15em",
                color: "#475569",
              }}
            >
              Aligned. Adaptive. Guiding Excellence.
            </p>

            <p
              style={{
                marginTop: 18,
                fontSize: "13px",
                color: "#64748b",
              }}
            >
              CBSE-Aligned Learning Platform
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            style={{
              display: "grid",
              gap: 18,
              width: 360,
            }}
          >
            <input
              type="text"
              placeholder="Student Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                padding: 14,
                borderRadius: 8,
                border: "1px solid #cbd5e1",
              }}
            />

            <select
              value={studentClass}
              onChange={(e) => setStudentClass(e.target.value)}
              style={{
                padding: 14,
                borderRadius: 8,
                border: "1px solid #cbd5e1",
              }}
            >
              <option value="">Select Class</option>
              {[6, 7, 8, 9, 10, 11, 12].map((cls) => (
                <option key={cls} value={cls}>
                  Class {cls}
                </option>
              ))}
            </select>

            <input
              type="password"
              placeholder="Access Code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              style={{
                padding: 14,
                borderRadius: 8,
                border: "1px solid #cbd5e1",
              }}
            />

            {error && (
              <div style={{ color: "#dc2626", fontSize: 13 }}>{error}</div>
            )}

            <button
              type="submit"
              style={{
                padding: 14,
                borderRadius: 8,
                border: "none",
                background: "linear-gradient(to right, #F6C56F, #E8A93B)",
                color: "#0f172a",
                fontWeight: 700,
                letterSpacing: "0.1em",
                cursor: "pointer",
              }}
            >
              ENTER SHAURI
            </button>
          </form>
        </div>
      )}
    </>
  );
}
