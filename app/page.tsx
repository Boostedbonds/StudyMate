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
      <AnimatePresence>
        {!entered && (
          <motion.div
            style={{
              position: "fixed",
              inset: 0,
              background: "linear-gradient(to top, #000814 0%, #001d3d 100%)",
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
            {/* Dawn Glow Behind Summit */}
            <motion.div
              style={{
                position: "absolute",
                bottom: "48%",
                left: "50%",
                transform: "translateX(-50%)",
                width: "1000px",
                height: "700px",
                background:
                  "radial-gradient(circle at center, rgba(255,210,120,0.45), transparent 70%)",
                filter: "blur(120px)",
              }}
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 9, repeat: Infinity }}
            />

            {/* Mountain Layers */}
            <svg
              viewBox="0 0 1440 800"
              preserveAspectRatio="none"
              style={{
                position: "absolute",
                bottom: 0,
                width: "100%",
                height: "80%",
              }}
            >
              {/* Far Layer */}
              <path
                d="
                  M0,640
                  C200,600 350,580 550,570
                  C750,560 950,580 1440,620
                  L1440,800 L0,800 Z
                "
                fill="#061a2d"
              />

              {/* Mid Layer */}
              <path
                d="
                  M0,690
                  C200,640 350,610 550,600
                  C650,590 720,570 820,590
                  C1000,630 1200,660 1440,690
                  L1440,800 L0,800 Z
                "
                fill="#04121f"
              />

              {/* Main Foreground Mountain (Reference-Based Structure) */}
              <path
                d="
                  M0,730
                  C150,690 300,660 450,640
                  C600,620 660,580 700,520
                  C710,500 715,490 720,480
                  C725,490 735,510 760,540
                  C820,600 920,640 1100,670
                  C1250,695 1350,710 1440,720
                  L1440,800 L0,800 Z
                "
                fill="#000000"
              />
            </svg>

            {/* Cinematic Grain Overlay */}
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

            {/* Brand */}
            <motion.div
              style={{
                textAlign: "center",
                position: "relative",
                transform: "translateY(-30px)",
              }}
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 1.6 }}
            >
              <h1
                style={{
                  fontSize: "64px",
                  letterSpacing: "0.5em",
                  color: "#FFD166",
                  fontWeight: 600,
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
                  marginTop: 28,
                  fontSize: "12px",
                  letterSpacing: "0.3em",
                  color: "#FFD166",
                }}
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                CLICK TO ENTER
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

      {entered && (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background:
              "linear-gradient(180deg, #f8fafc 0%, #e2f0ff 100%)",
          }}
        >
          <div
            style={{
              background: "rgba(255,255,255,0.95)",
              padding: 48,
              borderRadius: 24,
              width: 480,
              boxShadow: "0 20px 40px rgba(0,0,0,0.1)",
            }}
          >
            <div style={{ textAlign: "center", marginBottom: 32 }}>
              <h2
                style={{
                  fontSize: 28,
                  letterSpacing: "0.3em",
                  fontWeight: 600,
                }}
              >
                SHAURI
              </h2>
              <p style={{ marginTop: 10, fontSize: 13, color: "#64748b" }}>
                Aligned. Adaptive. Guiding Excellence.
              </p>
            </div>

            <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16 }}>
              <input
                type="text"
                placeholder="Student Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{ padding: 14, borderRadius: 10, border: "1px solid #ccc" }}
              />

              <select
                value={studentClass}
                onChange={(e) => setStudentClass(e.target.value)}
                style={{ padding: 14, borderRadius: 10, border: "1px solid #ccc" }}
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
                style={{ padding: 14, borderRadius: 10, border: "1px solid #ccc" }}
              />

              {error && (
                <div style={{ color: "red", fontSize: 13 }}>{error}</div>
              )}

              <button
                type="submit"
                style={{
                  padding: 14,
                  borderRadius: 10,
                  border: "none",
                  background: "#2563eb",
                  color: "white",
                  cursor: "pointer",
                }}
              >
                Enter SHAURI
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
