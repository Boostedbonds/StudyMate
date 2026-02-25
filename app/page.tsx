"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Orbitron } from "next/font/google";

const orbitron = Orbitron({ subsets: ["latin"], weight: ["400", "600", "700"] });
const ACCESS_CODE = "0330";

export default function HomePage() {
  const [entered, setEntered] = useState(false);
  const [warp, setWarp] = useState(false);
  const [name, setName] = useState("");
  const [studentClass, setStudentClass] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  function handleEnter() { setWarp(true); setTimeout(() => setEntered(true), 900); }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError("");
    if (!name.trim()) return setError("Please enter student name");
    if (!studentClass) return setError("Please select class");
    if (code !== ACCESS_CODE) return setError("Invalid access code");
    const s = { name: name.trim(), class: studentClass, board: "CBSE" };
    localStorage.setItem("shauri_student", JSON.stringify(s));
    document.cookie = `shauri_name=${encodeURIComponent(s.name)}; path=/`;
    document.cookie = `shauri_class=${encodeURIComponent(s.class)}; path=/`;
    window.location.href = "/modes";
  }

  return (
    <div className={orbitron.className} style={{ minHeight: "100vh" }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }

        /* ─── LANDING ─── */
        .land {
          position: fixed; inset: 0;
          background: linear-gradient(to top, #000814 0%, #001d3d 55%, #0a2540 100%);
          /* flex column: sun (decorative), content, mountain */
          display: flex; flex-direction: column;
          align-items: center; overflow: hidden;
        }

        /* Sun is purely decorative — absolutely positioned, never affects layout */
        .sun {
          position: absolute;
          top: -10%; left: 50%; transform: translateX(-50%);
          width: min(70vw, 460px); height: min(70vw, 460px);
          border-radius: 50%;
          background: radial-gradient(circle,
            rgba(255,215,120,1) 0%,
            rgba(255,180,60,0.55) 45%,
            transparent 75%);
          filter: blur(10px);
          pointer-events: none; z-index: 0;
        }

        /* All real content stacked in normal flow */
        .content {
          position: relative; z-index: 2;
          display: flex; flex-direction: column;
          align-items: center; text-align: center;
          padding: 0 20px;
          /* Push content down from top — scales with height */
          margin-top: max(12vh, 48px);
          gap: clamp(10px, 2.5vh, 22px);
        }

        .main-title {
          /* Key fix: font-size drives letter-spacing budget.
             On a 390px screen, "SHAURI" at 0.4em spacing = ~7 chars × size × 1.4
             clamp ensures it always fits within viewport width */
          font-size: clamp(38px, 11.5vw, 80px);
          /* Letter spacing relative to font — stays proportional */
          letter-spacing: 0.32em;
          font-weight: 700;
          color: #FFD700;
          text-shadow:
            0 0 24px rgba(255,215,120,0.9),
            0 0 50px rgba(255,200,80,0.5),
            0 2px 8px rgba(0,0,0,0.9);
          line-height: 1;
          white-space: nowrap;
          /* Safety: if somehow still too wide, scale down */
          max-width: 100%;
        }

        .tagline {
          color: #fff;
          font-size: clamp(8px, 2.3vw, 13px);
          letter-spacing: clamp(0.06em, 1.2vw, 0.16em);
          line-height: 1.55; opacity: 0.9;
          max-width: 320px;
        }

        .subtitle {
          color: #FFD700;
          font-size: clamp(7px, 1.9vw, 12px);
          letter-spacing: clamp(0.05em, 0.9vw, 0.14em);
          opacity: 0.85; line-height: 1.55;
          max-width: 300px;
        }

        .cta-btn {
          position: relative; overflow: hidden;
          padding: clamp(11px, 2.8vw, 15px) clamp(26px, 7vw, 48px);
          border-radius: 999px;
          border: 1.5px solid rgba(255,215,0,0.55);
          color: #FFD700;
          font-size: clamp(10px, 2.5vw, 14px);
          letter-spacing: clamp(0.1em, 1.8vw, 0.35em);
          white-space: nowrap; cursor: pointer;
          font-family: inherit;
        }

        /* Mountain at very bottom — fixed height, never overlaps content */
        .mountain {
          position: absolute; bottom: 0; left: 0; right: 0;
          z-index: 1; pointer-events: none;
          /* Height scales but caps so it stays below content */
          height: clamp(80px, 18vh, 180px);
        }

        /* Landscape: compress vertical gaps */
        @media (orientation: landscape) and (max-height: 500px) {
          .content { margin-top: max(6vh, 24px); gap: 8px; }
          .main-title { font-size: clamp(28px, 8vh, 48px); }
          .tagline { font-size: clamp(7px, 1.6vh, 10px); }
          .subtitle { font-size: clamp(6px, 1.4vh, 9px); }
          .cta-btn { padding: 8px 26px; font-size: 10px; letter-spacing: 0.14em; }
          .mountain { height: clamp(60px, 14vh, 110px); }
        }

        /* ─── ACCESS FORM ─── */
        .access-page {
          min-height: 100vh; min-height: 100dvh;
          display: flex; justify-content: center;
          align-items: center; flex-direction: column;
          background: linear-gradient(to bottom, #e6d3a3, #d6c08d);
          padding: 32px 20px; gap: 0;
        }
        .access-title {
          font-size: clamp(24px, 7.5vw, 48px);
          letter-spacing: clamp(0.16em, 3.5vw, 0.42em);
          font-weight: 700; color: #0f172a;
          text-shadow: 0 2px 4px rgba(0,0,0,0.15);
          text-align: center;
        }
        .access-sub {
          margin-top: 10px; margin-bottom: 28px;
          opacity: 0.7;
          font-size: clamp(10px, 2.4vw, 13px);
          letter-spacing: 0.06em; line-height: 1.5;
          text-align: center;
        }
        .access-form {
          display: grid; gap: 14px;
          width: 100%; max-width: 340px;
        }
        .a-input {
          padding: 14px 16px; border-radius: 14px;
          border: 1px solid #d4af37; width: 100%;
          background: #f8fafc;
          font-size: 16px; /* prevents iOS zoom */
          font-family: inherit; color: #0f172a;
          -webkit-appearance: none; appearance: none;
        }
        .a-input:focus {
          outline: none; border-color: #b8960a;
          box-shadow: 0 0 0 3px rgba(212,175,55,0.2);
        }
        .a-btn {
          padding: 14px; border-radius: 999px;
          border: 1px solid #d4af37; background: transparent;
          cursor: pointer; font-size: 14px; font-family: inherit;
          letter-spacing: 0.16em; color: #0f172a; font-weight: 600;
          -webkit-appearance: none;
        }
        .a-btn:active { background: rgba(212,175,55,0.15); }
        .access-footer {
          margin-top: 32px; opacity: 0.6;
          font-size: clamp(9px, 1.9vw, 11px);
          text-align: center; line-height: 1.6;
          letter-spacing: 0.05em; max-width: 280px;
        }
        .err { color: #dc2626; margin-top: 10px; font-size: 13px; text-align: center; }
      `}</style>

      {/* ── LANDING ── */}
      <AnimatePresence>
        {!entered && (
          <motion.div className="land"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>

            <div className="sun" />

            {/* All text content — stacked naturally in DOM order */}
            <div className="content">
              <h1 className="main-title">SHAURI</h1>
              <p className="tagline">THE COURAGE TO MASTER THE FUTURE</p>
              <p className="subtitle">CBSE-ALIGNED ADAPTIVE LEARNING PLATFORM</p>

              <motion.div onClick={handleEnter}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ cursor: "pointer" }}>
                <div className="cta-btn">
                  <motion.div
                    style={{
                      position: "absolute", top: 0, left: "-100%",
                      width: "100%", height: "100%",
                      background: "linear-gradient(90deg, transparent, rgba(255,215,0,0.55), transparent)",
                    }}
                    animate={{ left: ["-100%", "100%"] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  BEGIN THE ASCENT
                </div>
              </motion.div>
            </div>

            {/* Mountain — absolute, behind content (z-index 1 < content z-index 2) */}
            <svg className="mountain" viewBox="0 0 390 180"
              preserveAspectRatio="xMidYMax meet">
              <path
                d="M0,160 C80,140 170,110 195,50 C220,110 310,140 390,155 L390,180 L0,180 Z"
                fill="black" />
            </svg>

            {warp && (
              <motion.div style={{ position: "absolute", inset: 0, background: "white", zIndex: 99 }}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── ACCESS FORM ── */}
      {entered && (
        <div className="access-page">
          <h1 className="access-title">SHAURI</h1>
          <p className="access-sub">CBSE-Aligned. Adaptive. Built for your growth.</p>
          <form onSubmit={handleSubmit} className="access-form">
            <input value={name} onChange={e => setName(e.target.value)}
              placeholder="Student Name" className="a-input"
              autoComplete="name" autoCapitalize="words" />
            <select value={studentClass} onChange={e => setStudentClass(e.target.value)}
              className="a-input">
              <option value="">Select Class</option>
              {[6,7,8,9,10,11,12].map(c => (
                <option key={c} value={`Class ${c}`}>Class {c}</option>
              ))}
            </select>
            <input type="password" value={code} onChange={e => setCode(e.target.value)}
              placeholder="Access Code" className="a-input"
              autoComplete="current-password" />
            <button type="submit" className="a-btn">STEP IN</button>
          </form>
          {error && <p className="err">{error}</p>}
          <p className="access-footer">Discipline today builds the confidence of tomorrow.</p>
        </div>
      )}
    </div>
  );
}