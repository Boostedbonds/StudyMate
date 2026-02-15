"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Orbitron } from "next/font/google";

const orbitron = Orbitron({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
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

    const ctx = {
      name: name.trim(),
      class: studentClass,
      board: "CBSE",
    };

    localStorage.setItem("shauri_student", JSON.stringify(ctx));

    document.cookie =
      `shauri_name=${encodeURIComponent(ctx.name)}; path=/; SameSite=Lax`;

    document.cookie =
      `shauri_class=${encodeURIComponent(ctx.class)}; path=/; SameSite=Lax`;

    window.location.href = "/modes";
  }

  return (
    <div className={orbitron.className}>

      {/* ================= INTRO ================= */}

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
          >

            {/* SUN — perfectly centered behind SHAURI */}
            <motion.div
              onClick={handleEnter}
              style={{
                position: "absolute",
                top: "28%",                 // adjusted to align exactly behind SHAURI
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: "520px",
                height: "520px",
                borderRadius: "50%",
                background:
                  "radial-gradient(circle, rgba(255,230,150,0.95) 0%, rgba(255,220,140,0.55) 25%, rgba(255,220,140,0.25) 45%, rgba(255,220,140,0.08) 65%, transparent 75%)",
                filter: "blur(10px)",
                zIndex: 1,
                cursor: "pointer",
              }}
              animate={{
                opacity: [0.7, 1, 0.7],
                scale: [0.98, 1.06, 0.98],
              }}
              transition={{
                duration: 6,
                repeat: Infinity,
              }}
            />

            {/* Mountain — untouched */}
            <svg
              viewBox="0 0 1440 800"
              preserveAspectRatio="none"
              style={{
                position: "absolute",
                bottom: 0,
                width: "100%",
                height: "75%",
                zIndex: 2,
                pointerEvents: "none",
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


            {/* TITLE BLOCK — lifted upward */}
            <div
              style={{
                position: "absolute",
                top: "26%",       // lifted from 32% → now clearly separated
                width: "100%",
                textAlign: "center",
                zIndex: 4,
              }}
            >

              <h1
                style={{
                  fontSize: "72px",
                  fontWeight: 700,
                  letterSpacing: "0.28em",
                  color: "#D4AF37",
                }}
              >
                SHAURI
              </h1>

              <p
                style={{
                  marginTop: "18px",
                  fontSize: "15px",
                  letterSpacing: "0.18em",
                  color: "rgba(255,255,255,0.9)",
                }}
              >
                THE COURAGE TO MASTER THE FUTURE
              </p>

              <p
                style={{
                  marginTop: "10px",
                  fontSize: "12px",
                  letterSpacing: "0.16em",
                  color: "rgba(212,175,55,0.75)",
                }}
              >
                CBSE-ALIGNED ADAPTIVE LEARNING PLATFORM
              </p>

            </div>


            {/* BEGIN THE ASCENT — untouched summit alignment */}
            <motion.div
              onClick={handleEnter}
              style={{
                position: "absolute",
                left: "50%",
                bottom: "34%",
                transform: "translate(-50%, 140%)",
                zIndex: 5,
                cursor: "pointer",
                fontSize: "12px",
                letterSpacing: "0.35em",
                color: "#FFD875",
              }}
              animate={{
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
              }}
            >
              BEGIN THE ASCENT
            </motion.div>


            {/* Warp */}
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


      {/* ================= ACCESS PAGE ================= */}

      {entered && (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          Access page (unchanged)
        </div>
      )}

    </div>
  );
}
