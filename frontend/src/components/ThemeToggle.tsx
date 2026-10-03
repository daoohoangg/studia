"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem("studia-theme") as "dark" | "light" | null;
    const initialTheme = savedTheme || "light";
    setTheme(initialTheme);
    document.documentElement.setAttribute("data-theme", initialTheme);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("studia-theme", nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
  };

  if (!mounted) {
    return (
      <div style={{ width: "100%", height: "40px", borderRadius: "12px", background: "rgba(0,0,0,0.03)" }} />
    );
  }

  return (
    <button
      onClick={toggleTheme}
      title={theme === "dark" ? "Chuyển sang giao diện Sáng" : "Chuyển sang giao diện Tối"}
      style={{
        width: "100%",
        padding: "10px 14px",
        borderRadius: "12px",
        border: "1px solid var(--border-subtle)",
        background: "var(--bg-card)",
        color: "var(--text-primary)",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        fontSize: "0.85rem",
        fontWeight: "600",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        transition: "all 0.2s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "rgba(99, 102, 241, 0.12)";
        e.currentTarget.style.borderColor = "rgba(99, 102, 241, 0.3)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "var(--bg-card)";
        e.currentTarget.style.borderColor = "var(--border-subtle)";
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        {theme === "dark" ? (
          <Sun size={17} color="#fbbf24" />
        ) : (
          <Moon size={17} color="#818cf8" />
        )}
        <span>{theme === "dark" ? "Giao diện Tối" : "Giao diện Sáng"}</span>
      </div>
      <span style={{ fontSize: "0.7rem", opacity: 0.7, padding: "2px 6px", borderRadius: "6px", background: "rgba(99,102,241,0.1)" }}>
        {theme === "dark" ? "Dark" : "Light"}
      </span>
    </button>
  );
}
