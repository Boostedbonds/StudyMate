"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Space_Grotesk } from "next/font/google";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

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

    if (!name.trim()) {
      setError("Please enter student name");
      return;
    }

    if (!studentClass) {
      setError("Please select class");
      return;
    }

    if (code !== ACCESS_CODE) {
      setError("Invalid access code");
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

    window.location.href = "/modes";
  }

  const handleEnter = () => {
    setWarp(true);
    setTimeout(() => setEntered(true), 900);
  };

  return (
    <div className={spaceGrotesk.className}>
      {/* ================= INTRO SCREEN ================= */}
      <AnimatePresence>
        {!entered && (
          <motion.div
            style={{
              position: "fixed",
              inset: 0,
              background:
                "linear-gradient(to top, #000814 0%, #001d3d 60%, #0a2540 100%)",
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            onClick={handleEnter}
          >
            {/* Dawn glow */}
            <motion.div
              style={{
                position: "absolute",
                bottom: "42%",
                left: "50%",
                transform: "translateX(-50%)",
                width: "800px",
                height: "500px",
                background:
                  "radial-gradient(circle at center, rgba(255,210,120,0.4), transparent 70%)",
                filter: "blur(120px)",
              }}
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 8, repeat: Infinity }}
            />

            {/* Mountain silhouette (RESTORED) */}
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
                d="M0,640 C200,600 350,580 550,560 C750,540 950,570 1440,620 L1440,800 L0,800 Z"
                fill="#061a2d"
              />
              <path
                d="M0,700 C200,650 400,620 600,600 C700,580 760,550 820,600 C1000,650 1200,680 1440,710 L1440,800 L0,800 Z"
                fill="#04121f"
              />
              <path
                d="M0,730 C200,690 400,660 620,620 C680,590 710,550 720,500 C730,550 760,590 820,620 C1000,660 1200,700 1440,720 L1440,800 L0,800 Z"
                fill="#000000"
              />
            </svg>

            {/* Intro text */}
            <motion.div
              style={{ textAlign: "center", position: "relative" }}
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 1.6 }}
            >
              <h1
                style={{
                  fontSize: "64px",
                  letterSpacing: "0.55em",
                  fontWeight: 600,
                  color: "#D4AF37",
                }}
              >
                SHAURI
              </h1>

              <p
                style={{
                  marginTop: 24,
                  fontSize: "14px",
                  letterSpacing: "0.28em",
                  color: "rgba(255,255,255,0.85)",
                }}
              >
                Aligned. Adaptive. Guiding Excellence.
              </p>

              <p
                style={{
                  marginTop: 14,
                  fontSize: "12px",
                  letterSpacing: "0.22em",
                  color: "rgba(212,175,55,0.75)",
                }}
              >
                CBSE-Aligned Adaptive Learning Platform
              </p>
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

      {/* ================= ACCESS CONTROL PAGE ================= */}
      {entered && (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background:
              "linear-gradient(to bottom, #FFF3D9 0%, #FFE4B3 40%, #E6F2FF 85%, #F8FAFC 100%)",
            padding: "40px 20px",
          }}
        >
          <h1
            style={{
              fontSize: "48px",
              letterSpacing: "0.55em",
              fontWeight: 600,
              color: "#1e293b",
            }}
          >
            SHAURI
          </h1>

          <p
            style={{
              marginTop: 16,
              fontSize: "14px",
              letterSpacing: "0.28em",
              color: "rgba(30,41,59,0.8)",
            }}
          >
            Aligned. Adaptive. Guiding Excellence.
          </p>

          <p
            style={{
              marginTop: 10,
              fontSize: "12px",
              letterSpacing: "0.22em",
              color: "rgba(30,41,59,0.6)",
            }}
          >
            CBSE-Aligned Adaptive Learning Platform
          </p>

          {/* ACCESS FORM */}
          <motion.form
            onSubmit={handleSubmit}
            style={{
              marginTop: 40,
              display: "grid",
              gap: 18,
              width: "380px",
              padding: 28,
              borderRadius: 18,
              background: "rgba(255,255,255,0.85)",
              backdropFilter: "blur(14px)",
              boxShadow: "0 25px 70px rgba(255,180,80,0.25)",
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
                <option key={c} value={c}>
                  Class {c}
                </option>
              ))}
            </select>

            <input
              type="password"
              placeholder="Access Code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              style={inputStyle}
            />

            {error && (
              <div style={{ color: "#dc2626", fontSize: 13 }}>{error}</div>
            )}

            {/* WORKING STEP IN BUTTON */}
            <motion.button
              type="submit"
              animate={{
                boxShadow: [
                  "0 0 12px rgba(212,175,55,0.2)",
                  "0 0 28px rgba(212,175,55,0.5)",
                  "0 0 12px rgba(212,175,55,0.2)",
                ],
              }}
              transition={{ duration: 3, repeat: Infinity }}
              whileHover={{
                scale: 1.08,
                boxShadow: "0 0 50px rgba(212,175,55,0.8)",
              }}
              whileTap={{
                scale: 0.94,
                boxShadow: "0 0 70px rgba(212,175,55,1)",
              }}
              style={{
                padding: "16px",
                borderRadius: "999px",
                border: "1px solid rgba(212,175,55,0.7)",
                background: "rgba(255,255,255,0.75)",
                fontWeight: 600,
                letterSpacing: "0.28em",
                cursor: "pointer",
              }}
            >
              STEP IN
            </motion.button>
          </motion.form>

          <p
            style={{
              marginTop: 30,
              fontSize: 11,
              letterSpacing: "0.24em",
              color: "#64748b",
            }}
          >
            Crafted for Focused Minds.
          </p>
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: 14,
  borderRadius: 12,
  border: "1px solid #e2e8f0",
  background: "rgba(255,255,255,0.9)",
  fontSize: 14,
};
