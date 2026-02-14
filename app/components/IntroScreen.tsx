"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Props = {
  onEnter: () => void;
};

export default function IntroScreen({ onEnter }: Props) {
  const [warp, setWarp] = useState(false);

  const handleEnter = () => {
    setWarp(true);
    setTimeout(() => {
      onEnter();
    }, 600);
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-[#0B0B0F] flex items-center justify-center overflow-hidden cursor-pointer"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 1 }}
        onClick={handleEnter}
      >
        {/* Mountain Ascent Layer */}
        <motion.div
          className="absolute bottom-0 w-full h-[200%] bg-gradient-to-t from-black via-[#0B0B0F] to-transparent"
          initial={{ y: 200 }}
          animate={{ y: -100 }}
          transition={{ duration: 2, ease: "easeOut" }}
        />

        {/* Apex Glow */}
        <motion.div
          className="absolute top-1/3 w-4 h-4 rounded-full bg-[#C6A85A]"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 4, opacity: 0.4 }}
          transition={{ delay: 1.5, duration: 1 }}
          style={{
            boxShadow: "0 0 80px rgba(198,168,90,0.6)",
          }}
        />

        {/* Logo Content */}
        <motion.div
          className="relative text-center z-10"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.8, duration: 1 }}
        >
          <h1 className="text-5xl md:text-6xl tracking-[0.4em] font-semibold text-[#C6A85A]">
            SHAURI
          </h1>

          <p className="mt-6 text-sm md:text-base tracking-widest text-gray-400">
            The Courage to Master the Future
          </p>

          <motion.p
            className="mt-10 text-xs uppercase tracking-[0.3em] text-[#C6A85A]"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            Click to Enter
          </motion.p>
        </motion.div>

        {/* Warp Effect */}
        {warp && (
          <motion.div
            className="absolute inset-0 bg-[#C6A85A]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
}
