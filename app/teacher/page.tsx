"use client";

import Header from "../components/Header";
import ChatBox from "../components/ChatBox";

export default function TeacherPage() {
  return (
    <div style={{ height: "100vh", background: "#f8fafc" }}>
      <Header onLogout={() => (window.location.href = "/")} />
      <ChatBox mode="teacher" />
    </div>
  );
}
