"use client";

/** Tuỳ chọn giao diện/âm thanh lưu ở trình duyệt (mỗi thiết bị một bản). */
export type Prefs = {
  voice: "en-GB" | "en-US";
  rate: 0.8 | 1 | 1.2;
  autoSpeak: boolean;
  theme: "light" | "dark" | "system";
  font: "sm" | "md" | "lg";
  reduceMotion: boolean;
  remind: boolean;
  remindStreak: boolean;
  weeklyEmail: boolean;
};

export const DEFAULT_PREFS: Prefs = {
  voice: "en-GB", rate: 1, autoSpeak: false, theme: "system", font: "md", reduceMotion: false,
  remind: false, remindStreak: false, weeklyEmail: false,
};

const KEY = "studia-prefs";

export function loadPrefs(): Prefs {
  try { return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem(KEY) || "{}") }; } catch { return DEFAULT_PREFS; }
}

/** Ghi tuỳ chọn và áp dụng ngay lên <html>. */
export function savePrefs(p: Prefs) {
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch {}
  applyPrefs(p);
}

export function applyPrefs(p: Prefs) {
  const el = document.documentElement;
  el.setAttribute("data-font", p.font);
  el.setAttribute("data-motion", p.reduceMotion ? "reduce" : "auto");
  let theme = p.theme;
  if (theme === "system") {
    try { localStorage.removeItem("studia-theme"); } catch {}
    theme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  } else {
    try { localStorage.setItem("studia-theme", theme); } catch {}
  }
  el.setAttribute("data-theme", theme);
}
