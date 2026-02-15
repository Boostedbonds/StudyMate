"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Orbitron } from "next/font/google";

const orbitron = Orbitron({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const ACCESS_CODE = "0330";

/*
Summit tip location from SVG path:
viewBox height = 800
summit tip Y ≈ 500

500 / 800 = 62.5% from top
So bottom must be 37.5%
*/

const SUMMIT_BOTTOM = "37.5%";

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

            {/* SUN — TRUE CENTER */}
            <motion.div
              style={{
                position: "absolute",
                top: "32%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: "620px",
                height: "620px",
                borderRadius: "50%",
                background:
                  "radial-gradient(circle, rgba(255,215,120,0.55) 0%, rgba(255,215,120,0.30) 30%, rgba(255,215,120,0.15) 55%, rgba(255,215,120,0.06) 75%, transparent 90%)",
                filter: "blur(24px)",
                zIndex: 1,
                pointerEvents: "none",
              }}

              animate={{
                opacity: [0.8, 1, 0.8],
              }}

              transition={{
                duration: 6,
                repeat: Infinity,
              }}
            />

            {/* BEAM — TRUE CENTER */}
            <motion.div
              onClick={handleEnter}
              style={{
                position: "absolute",
                top: "32%",
                bottom: SUMMIT_BOTTOM,
                left: "50%",
                transform: "translateX(-50%)",
                width: "160px",
                background:
                  "linear-gradient(to bottom, rgba(255,215,120,0.40), rgba(255,215,120,0.18), rgba(255,215,120,0.05), transparent)",
                filter: "blur(16px)",
                borderRadius: "80px",
                zIndex: 3,
                cursor: "pointer",
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
                zIndex: 2,
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

            {/* BEGIN — EXACT SUMMIT */}
            <motion.div

              onClick={handleEnter}

              style={{
                position: "absolute",
                bottom: SUMMIT_BOTTOM,
                left: "50%",
                transform: "translate(-50%, 50%)",
                fontSize: "13px",
                letterSpacing: "0.40em",
                color: "#D4AF37",
                zIndex: 5,
                cursor: "pointer",
              }}

              animate={{
                opacity: [0.5, 1, 0.5],
              }}

              transition={{
                duration: 2,
                repeat: Infinity,
              }}
            >

              BEGIN THE ASCENT

            </motion.div>

            {/* TITLE */}
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
                  marginTop: "28px",
                  fontSize: "15px",
                  letterSpacing: "0.30em",
                  color: "rgba(255,255,255,0.9)",
                }}
              >
                THE COURAGE TO MASTER THE FUTURE
              </p>

              <p
                style={{
                  marginTop: "18px",
                  fontSize: "13px",
                  letterSpacing: "0.28em",
                  color: "rgba(212,175,55,0.95)",
                }}
              >
                CBSE-ALIGNED ADAPTIVE LEARNING PLATFORM
              </p>

            </div>

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
          }}
        >

          ACCESS PAGE

        </div>

      )}

    </div>

  );

}
