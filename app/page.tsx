"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Orbitron } from "next/font/google";

const orbitron = Orbitron({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const ACCESS_CODE = "0330";

/* 🔥 Dynamic Line */
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

  const [activeField, setActiveField] = useState<string | null>(null);

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
    <div className={orbitron.className} style={{ width: "100%", minHeight: "100vh", overflowX: "hidden" }}>

      {/* ENTRY SCREEN (UNCHANGED) */}
      <AnimatePresence>
        {!entered && (
          <motion.div
            style={{
              position: "fixed",
              inset: 0,
              background:
                "linear-gradient(to top, #000814 0%, #001d3d 60%, #0a2540 100%)",
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* keep your existing hero untouched */}
            <motion.div
              onClick={handleEnter}
              style={{
                position: "absolute",
                bottom: "34%",
                left: "50%",
                transform: "translateX(-50%)",
                letterSpacing: "0.38em",
                color: "#D4AF37",
                cursor: "pointer",
              }}
            >
              BEGIN THE ASCENT
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

      {/* ✅ ACCESS PAGE (FULL UPGRADE) */}
      {entered && (
        <div
          style={{
            minHeight: "100vh",
            background:
              "linear-gradient(to bottom, #FFF3D9 0%, #FFE4B3 35%, #E6F2FF 70%, #F8FAFC 100%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* glow */}
          <div
            style={{
              position: "absolute",
              top: "20%",
              left: "50%",
              transform: "translateX(-50%)",
              width: "400px",
              height: "400px",
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(255,200,100,0.25), transparent 70%)",
              filter: "blur(40px)",
            }}
          />

          {/* heading */}
          <div style={{ textAlign: "center", marginBottom: "20px", zIndex: 2 }}>
            <h1 style={{ fontSize: "32px", letterSpacing: "0.45em" }}>
              SHAURI
            </h1>

            <p style={{ marginTop: "10px", fontSize: "14px", color: "#333" }}>
              Welcome. Let’s begin your journey.
            </p>

            <p style={{ fontSize: "12px", letterSpacing: "0.2em", color: "#B08A2E" }}>
              CBSE-ALIGNED ADAPTIVE LEARNING PLATFORM
            </p>
          </div>

          {/* form */}
          <form
            onSubmit={handleSubmit}
            style={{ display: "grid", gap: "16px", width: "100%", maxWidth: "340px", zIndex: 2 }}
          >
            {/* NAME */}
            <input
              placeholder="Student Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onFocus={() => setActiveField("name")}
              onBlur={() => setActiveField(null)}
              style={{
                ...inputStyle,
                boxShadow:
                  activeField === "name"
                    ? "0 0 12px rgba(212,175,55,0.35)"
                    : "none",
                transform: activeField === "name" ? "scale(1.02)" : "scale(1)",
              }}
            />

            {/* CLASS */}
            <select
              value={studentClass}
              onChange={(e) => setStudentClass(e.target.value)}
              onFocus={() => setActiveField("class")}
              onBlur={() => setActiveField(null)}
              style={{
                ...inputStyle,
                boxShadow:
                  activeField === "class"
                    ? "0 0 12px rgba(212,175,55,0.35)"
                    : "none",
                transform: activeField === "class" ? "scale(1.02)" : "scale(1)",
              }}
            >
              <option value="">Select Class</option>
              {[6, 7, 8, 9, 10, 11, 12].map((c) => (
                <option key={c}>Class {c}</option>
              ))}
            </select>

            {/* CODE */}
            <input
              type="password"
              placeholder="Access Code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onFocus={() => setActiveField("code")}
              onBlur={() => setActiveField(null)}
              style={{
                ...inputStyle,
                boxShadow:
                  activeField === "code"
                    ? "0 0 12px rgba(212,175,55,0.35)"
                    : "none",
                transform: activeField === "code" ? "scale(1.02)" : "scale(1)",
              }}
            />

            {error && <div style={{ color: "red" }}>{error}</div>}

            <button
              style={buttonStyle}
              onMouseEnter={(e) =>
                (e.currentTarget.style.boxShadow =
                  "0 0 12px rgba(212,175,55,0.4)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.boxShadow = "none")
              }
            >
              STEP IN
            </button>
          </form>

          {/* footer */}
          <div style={{ position: "absolute", bottom: "20px", fontSize: "11px", color: "#555" }}>
            Your journey is private. Your progress is yours.
          </div>
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "12px",
  borderRadius: "12px",
  border: "1px solid rgba(0,0,0,0.15)",
  width: "100%",
  fontSize: "16px",
  outline: "none",
  transition: "all 0.25s ease",
};

const buttonStyle: React.CSSProperties = {
  padding: "14px",
  borderRadius: "999px",
  border: "1px solid #D4AF37",
  background: "white",
  letterSpacing: "0.25em",
  cursor: "pointer",
  width: "100%",
};