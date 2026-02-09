"use client";

import React from "react";
import { saveNote } from "../lib/notesStore";

type Props = {
  content: string;
};

export default function SaveNoteButton({ content }: Props) {
  const handleSave = () => {
    if (!content) return;

    saveNote({
      id: crypto.randomUUID(),
      content,
      mode: "Teacher",
      date: new Date().toISOString(),
    });

    alert("Saved to Notes");
  };

  return (
    <button
      type="button"
      onClick={handleSave}
      className="text-sm px-3 py-1 rounded-lg border border-gray-300 hover:bg-gray-100"
    >
      📘 Save as Notes
    </button>
  );
}
