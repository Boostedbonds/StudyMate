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

    document.cookie = `shauri_name=${encodeURIComponent(studentContext.name)}; path=/; SameSite=Lax`;
    document.cookie = `shauri_class=${encodeURIComponent(studentContext.class)}; path=/; SameSite=Lax`;

    window.location.href = "/modes";
  }

  return (
    <div className={orbitron.className}>
      <AnimatePresence>
        {!entered && (
          <motion.div
            style={{
              position: "fixed",
              inset: 0,
              background:
                "linear-gradient(to top, #000814 0%, #001d3d 60%, #0a2540 100%)",
              overflow: "hidden",
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >

            {/* SUN PERFECTLY CENTERED BEHIND SHAURI */}
            <motion.div
              style={{
                position: "absolute",
                top: "30%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: "720px",
                height: "720px",
                borderRadius: "50%",
                background:
                  "radial-gradient(circle, rgba(255,215,120,0.55) 0%, rgba(255,215,120,0.32) 30%, rgba(255,215,120,0.16) 50%, rgba(255,215,120,0.07) 70%, transparent 85%)",
                filter: "blur(28px)",
                zIndex: 1,
                pointerEvents: "none",
              }}
              animate={{
                opacity: [0.75, 1, 0.75],
                scale: [1, 1.05, 1],
              }}
              transition={{
                duration: 6,
                repeat: Infinity,
              }}
            />

            {/* CENTER BEAM */}
            <motion.div
              onClick={handleEnter}
              style={{
                position: "absolute",
                top: "34%",
                bottom: "24%",
                left: "50%",
                transform: "translateX(-50%)",
                width: "160px",
                background:
                  "linear-gradient(to bottom, rgba(255,215,120,0.35), rgba(255,215,120,0.18), rgba(255,215,120,0.08), transparent)",
                filter: "blur(16px)",
                borderRadius: "100px",
                zIndex: 2,
                cursor: "pointer",
              }}
              animate={{
                opacity: [0.6, 1, 0.6],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
              }}
            />

            {/* MOUNTAIN */}
            <svg
              viewBox="0 0 1440 800"
              preserveAspectRatio="none"
              style={{
                position: "absolute",
                bottom: 0,
                width: "100%",
                height: "75%",
                zIndex: 3,
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

            {/* TITLE BLOCK */}
            <div
              style={{
                position: "absolute",
                top: "32%",
                width: "100%",
                textAlign: "center",
                zIndex: 4,
              }}
            >
              <h1
                style={{
                  fontSize: "72px",
                  letterSpacing: "0.55em",
                  fontWeight: 700,
                  color: "#D4AF37",
                }}
              >
                SHAURI
              </h1>

              <p
                style={{
                  marginTop: "26px",
                  fontSize: "15px",
                  letterSpacing: "0.30em",
                  color: "rgba(255,255,255,0.9)",
                }}
              >
                THE COURAGE TO MASTER THE FUTURE
              </p>

              <p
                style={{
                  marginTop: "16px",
                  fontSize: "13px",
                  letterSpacing: "0.28em",
                  color: "rgba(212,175,55,0.95)",
                }}
              >
                CBSE-ALIGNED ADAPTIVE LEARNING PLATFORM
              </p>
            </div>

            {/* GOLD SUMMIT TAB */}
            <motion.div
              onClick={handleEnter}
              style={{
                position: "absolute",
                bottom: "30.6%",
                left: "50%",
                transform: "translateX(-50%)",
                padding: "10px 22px",
                borderRadius: "999px",
                background:
                  "linear-gradient(180deg, rgba(255,215,120,0.95), rgba(212,175,55,0.92))",
                color: "#0a2540",
                fontSize: "12px",
                letterSpacing: "0.34em",
                fontWeight: 700,
                boxShadow:
                  "0 0 14px rgba(255,215,120,0.9), 0 0 36px rgba(255,215,120,0.5)",
                cursor: "pointer",
                zIndex: 6,
              }}
              animate={{
                scale: [1, 1.06, 1],
                boxShadow: [
                  "0 0 14px rgba(255,215,120,0.8)",
                  "0 0 32px rgba(255,215,120,1)",
                  "0 0 14px rgba(255,215,120,0.8)",
                ],
              }}
              transition={{
                duration: 2.2,
                repeat: Infinity,
              }}
            >
              BEGIN THE ASCENT
            </motion.div>

            {/* WARP */}
            {warp && (
              <motion.div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "white",
                  zIndex: 10,
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.9 }}
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
            background:
              "linear-gradient(to bottom, #FFF3D9, #FFE4B3, #E6F2FF, #F8FAFC)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16, width: 320 }}>
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
              {[6,7,8,9,10,11,12].map(c => (
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

            {error && <div style={{ color: "red" }}>{error}</div>}

            <button style={buttonStyle}>STEP IN</button>
          </form>
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "12px",
  borderRadius: "10px",
  border: "1px solid #ccc",
};

const buttonStyle: React.CSSProperties = {
  padding: "14px",
  borderRadius: "999px",
  border: "1px solid #D4AF37",
  background: "white",
  letterSpacing: "0.25em",
  cursor: "pointer",
};
