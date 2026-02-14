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

    const verify = localStorage.getItem("shauri_student");
    if (!verify) {
      setError("Storage error. Please try again.");
      return;
    }

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
    setTimeout(() => {
      setEntered(true);
    }, 600);
  };

  return (
    <>
      {/* INTRO SCREEN */}
      <AnimatePresence>
        {!entered && (
          <motion.div
            className="fixed inset-0 bg-[#0B0B0F] flex items-center justify-center cursor-pointer overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            onClick={handleEnter}
          >
            <motion.div
              className="text-center"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.5 }}
            >
              <h1 className="text-6xl tracking-[0.5em] text-[#C6A85A] font-semibold">
                SHAURI
              </h1>

              <p className="mt-6 text-sm tracking-widest text-gray-400">
                The Courage to Master the Future
              </p>

              <motion.p
                className="mt-12 text-xs uppercase tracking-[0.3em] text-[#C6A85A]"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                Click to Enter
              </motion.p>
            </motion.div>

            {warp && (
              <motion.div
                className="absolute inset-0 bg-white"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6 }}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ACCESS WORLD */}
      {entered && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="min-h-screen flex items-center justify-center relative"
          style={{
            background:
              "linear-gradient(180deg, #f8fafc 0%, #e2f0ff 100%)",
          }}
        >
          {/* Sunbeam */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: "50%",
              transform: "translateX(-50%)",
              width: "900px",
              height: "500px",
              background:
                "radial-gradient(circle at top, rgba(255,215,120,0.25), transparent 60%)",
              pointerEvents: "none",
            }}
          />

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="relative bg-white/90 backdrop-blur-md rounded-2xl p-10 w-[460px] shadow-xl"
          >
            {/* Branding */}
            <div className="text-center mb-8">
              <h1 className="text-3xl tracking-[0.3em] font-semibold text-gray-900">
                SHAURI
              </h1>
              <p className="mt-3 text-sm text-gray-500 tracking-wide">
                The Courage to Master the Future
              </p>
            </div>

            {/* Feature Row */}
            <div className="flex justify-between text-xs text-gray-500 mb-8">
              <span>AI Powered</span>
              <span>CBSE Structured</span>
              <span>Exam + Practice</span>
              <span>Parent Secured</span>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                placeholder="Student Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-4 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />

              <select
                value={studentClass}
                onChange={(e) => setStudentClass(e.target.value)}
                className="w-full p-4 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
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
                className="w-full p-4 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />

              {error && (
                <div className="text-red-600 text-sm">{error}</div>
              )}

              <button
                type="submit"
                className="w-full p-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium transition-all"
              >
                Enter Shauri
              </button>
            </form>

            <div className="mt-6 text-xs text-gray-500 text-center">
              Parent authorization required for student access.
            </div>
          </motion.div>
        </motion.div>
      )}
    </>
  );
}
