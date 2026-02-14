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
    document.cookie = `shauri_name=${encodeURIComponent(
      studentContext.name
    )}; path=/; SameSite=Lax`;
    document.cookie = `shauri_class=${encodeURIComponent(
      studentContext.class
    )}; path=/; SameSite=Lax`;

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
              background:
                "radial-gradient(circle at center, #0b1d33 0%, #071426 60%, #020812 100%)",
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
            {/* Dawn Glow Behind Peak */}
            <motion.div
              style={{
                position: "absolute",
                bottom: "42%",
                left: "50%",
                transform: "translateX(-50%)",
                width: "1200px",
                height: "800px",
                background:
                  "radial-gradient(circle at center, rgba(255,210,120,0.35), transparent 70%)",
                filter: "blur(120px)",
              }}
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 8, repeat: Infinity }}
            />

            {/* Mountain Layers */}
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
              {/* Far */}
              <path
                d="M0,640 C300,580 500,560 720,580 C900,600 1100,620 1440,600 L1440,800 L0,800 Z"
                fill="#081b2e"
              />

              {/* Mid */}
              <path
                d="M0,690 C300,650 500,620 720,640 C900,660 1100,690 1440,700 L1440,800 L0,800 Z"
                fill="#051423"
              />

              {/* Main Foreground Peak */}
              <path
                d="
                M0,740
                C200,700 400,670 600,650
                C650,640 700,600 720,540
                C740,600 790,640 860,660
                C1000,700 1200,720 1440,730
                L1440,800 L0,800 Z
              "
                fill="#000000"
              />
            </svg>

            {/* Grain */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                backgroundImage:
                  "url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"200\" height=\"200\"><filter id=\"noise\"><feTurbulence type=\"fractalNoise\" baseFrequency=\"0.8\" numOctaves=\"2\" stitchTiles=\"stitch\"/></filter><rect width=\"100%\" height=\"100%\" filter=\"url(%23noise)\" opacity=\"0.04\"/></svg>')",
                mixBlendMode: "overlay",
                pointerEvents: "none",
              }}
            />

            {/* Branding */}
            <motion.div
              style={{ textAlign: "center", position: "relative" }}
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 1.6 }}
            >
              <h1
                style={{
                  fontSize: "64px",
                  letterSpacing: "0.45em",
                  color: "#E6B65C",
                  fontWeight: 700,
                  fontFamily: "Georgia, serif",
                }}
              >
                SHAURI
              </h1>

              <p
                style={{
                  marginTop: 24,
                  fontSize: "14px",
                  letterSpacing: "0.2em",
                  color: "#cbd5e1",
                }}
              >
                Aligned. Adaptive. Guiding Excellence.
              </p>

              <motion.p
                style={{
                  marginTop: 32,
                  fontSize: "12px",
                  letterSpacing: "0.35em",
                  color: "#E6B65C",
                }}
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                BEGIN THE ASCENT
              </motion.p>
            </motion.div>

            {/* Warp */}
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
              "linear-gradient(to bottom, #FFF4D6 0%, #EAF3FF 55%, #F8FAFC 100%)",
            position: "relative",
            padding: "40px 20px",
          }}
        >
          {/* Branding */}
          <div style={{ textAlign: "center", marginBottom: 60 }}>
            <h1
              style={{
                fontSize: 44,
                letterSpacing: "0.3em",
                fontWeight: 700,
                fontFamily: "Georgia, serif",
                color: "#1e293b",
              }}
            >
              SHAURI
            </h1>

            <p
              style={{
                marginTop: 14,
                fontSize: 14,
                letterSpacing: "0.15em",
                color: "#475569",
              }}
            >
              Aligned. Adaptive. Guiding Excellence.
            </p>

            <p style={{ marginTop: 18, fontSize: 13, color: "#64748b" }}>
              CBSE Aligned Learning Platform
            </p>
          </div>

          {/* Form */}
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
                borderRadius: 10,
                border: "1px solid #cbd5e1",
              }}
            />

            <select
              value={studentClass}
              onChange={(e) => setStudentClass(e.target.value)}
              style={{
                padding: 14,
                borderRadius: 10,
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
                borderRadius: 10,
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
                borderRadius: 10,
                border: "none",
                background: "linear-gradient(to right, #F6C56F, #E8A93B)",
                color: "#1e293b",
                fontWeight: 600,
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
