"use client";

export default function Header({ onLogout }: { onLogout?: () => void }) {
  return (
    <header
      style={{
        padding: "16px 32px",
        background: "#ffffff",
        borderBottom: "1px solid #e5e7eb",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <div>
        <h2 style={{ margin: 0, color: "#1e3a8a" }}>StudyMate</h2>
        <small style={{ color: "#475569" }}>
          CBSE Class 9 Learning Platform
        </small>
      </div>

      {onLogout && (
        <button
          onClick={onLogout}
          style={{
            padding: "8px 14px",
            borderRadius: 8,
            border: "1px solid #1e3a8a",
            background: "#fff",
            color: "#1e3a8a",
            cursor: "pointer",
            fontWeight: 500,
          }}
        >
          Logout
        </button>
      )}
    </header>
  );
}
