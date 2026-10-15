"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "dark" | "light";

function currentTheme(): Theme {
  if (typeof document === "undefined") return "light";
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

/** Nút đổi giao diện sáng/tối — mặt trời và mặt trăng xoay đổi chỗ. */
export default function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    setTheme(currentTheme());
  }, []);

  const toggleTheme = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    try { localStorage.setItem("studia-theme", next); } catch {}
    document.documentElement.setAttribute("data-theme", next);
  };

  const label = theme === "dark" ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={label}
      aria-label={label}
      className={`theme-toggle${theme === "dark" ? " dark" : ""}`}
    >
      <span className="ti" aria-hidden="true">
        <Sun className="sun" size={20} strokeWidth={1.75} />
        <Moon className="moon" size={20} strokeWidth={1.75} />
      </span>
      {!compact && <span className="nav-label">{theme === "dark" ? "Giao diện tối" : "Giao diện sáng"}</span>}
    </button>
  );
}
