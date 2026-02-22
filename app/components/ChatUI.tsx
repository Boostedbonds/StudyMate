"use client";

import { useEffect, useRef, useState } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type Props = {
  messages: Message[];
  isOralMode?: boolean;
  language?: "en-IN" | "hi-IN";
};

function splitUploadedContent(content: string) {
  const uploadMarker = "[UPLOADED STUDY MATERIAL / ANSWER SHEET]";
  if (!content.includes(uploadMarker)) {
    return { uploaded: null, text: content };
  }

  const parts = content.split(uploadMarker);
  return {
    uploaded: parts[1]?.trim() ?? null,
    text: parts[0]?.trim() ?? "",
  };
}

export default function ChatUI({
  messages,
  isOralMode = false,
  language = "en-IN",
}: Props) {
  const lastSpokenIndexRef = useRef<number>(-1);
  const [selectedVoice, setSelectedVoice] =
    useState<SpeechSynthesisVoice | null>(null);

  /* -------------------- VOICE -------------------- */
  useEffect(() => {
    if (!("speechSynthesis" in window)) return;

    function pickVoice() {
      const voices = window.speechSynthesis.getVoices();

      const femaleVoice = voices.find(
        (v) =>
          v.lang === language &&
          /female|woman|zira|samantha|google/i.test(v.name)
      );

      const anyLanguageVoice = voices.find(
        (v) => v.lang === language
      );

      setSelectedVoice(femaleVoice || anyLanguageVoice || null);
    }

    pickVoice();
    window.speechSynthesis.onvoiceschanged = pickVoice;
  }, [language]);

  /* -------------------- SPEAK -------------------- */
  useEffect(() => {
    if (!isOralMode) return;
    if (!("speechSynthesis" in window)) return;

    const lastIndex = messages.length - 1;
    const lastMessage = messages[lastIndex];

    if (
      lastMessage?.role !== "assistant" ||
      lastIndex === lastSpokenIndexRef.current
    ) {
      return;
    }

    window.speechSynthesis.cancel();

    const cleanText =
      splitUploadedContent(lastMessage.content).text ||
      lastMessage.content;

    const utterance = new SpeechSynthesisUtterance(cleanText);

    utterance.lang = language;
    utterance.rate = 0.95;
    utterance.pitch = 1;

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    window.speechSynthesis.speak(utterance);
    lastSpokenIndexRef.current = lastIndex;

    return () => {
      window.speechSynthesis.cancel();
    };
  }, [messages, isOralMode, language, selectedVoice]);

  return (
    <div
      style={{
        maxWidth: "720px",
        margin: "0 auto",
        padding: "24px 12px",
      }}
    >
      {messages.map((m, i) => {
        const { uploaded, text } = splitUploadedContent(m.content);

        return (
          <div
            key={i}
            style={{
              marginBottom: "16px",
              display: "flex",
              justifyContent:
                m.role === "user" ? "flex-end" : "flex-start",
            }}
          >
            <div
              style={{
                background:
                  m.role === "user" ? "#38bdf8" : "#f1f5f9",
                color:
                  m.role === "user" ? "white" : "#0f172a",
                padding: "14px 18px",
                borderRadius: "16px",
                maxWidth: "85%",
                fontSize: "15px",
                lineHeight: "1.6",
                whiteSpace: "pre-wrap",
              }}
            >
              {uploaded && (
                <div
                  style={{
                    fontSize: "13px",
                    marginBottom: "8px",
                    opacity: 0.85,
                  }}
                >
                  📎 Uploaded file included
                </div>
              )}

              {text || m.content}
            </div>
          </div>
        );
      })}
    </div>
  );
}