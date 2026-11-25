"use client";

export type PomodoroMode = "work" | "short_break" | "long_break";

export interface PomodoroSettings {
  workMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  longBreakInterval: number;
  soundEnabled: boolean;
  autoStartNext: boolean;
  notifyEnabled: boolean;
}

export interface PomodoroStats {
  todayDate: string;
  sessionsCompleted: number;
  totalWorkMinutes: number;
}

export const DEFAULT_POMODORO_SETTINGS: PomodoroSettings = {
  workMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  longBreakInterval: 4,
  soundEnabled: true,
  autoStartNext: false,
  notifyEnabled: true,
};

export const POMODORO_PRESETS = [
  { id: "standard", name: "Tiêu chuẩn", work: 25, shortBreak: 5, longBreak: 15, desc: "25m học / 5m nghỉ" },
  { id: "deep", name: "Tập trung sâu", work: 50, shortBreak: 10, longBreak: 20, desc: "50m học / 10m nghỉ" },
  { id: "sprint", name: "Nhịp nhanh", work: 15, shortBreak: 3, longBreak: 10, desc: "15m học / 3m nghỉ" },
] as const;

const SETTINGS_KEY = "studia_pomodoro_settings";
const STATS_KEY = "studia_pomodoro_stats";

export function loadPomodoroSettings(): PomodoroSettings {
  if (typeof window === "undefined") return DEFAULT_POMODORO_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_POMODORO_SETTINGS;
    return { ...DEFAULT_POMODORO_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_POMODORO_SETTINGS;
  }
}

export function savePomodoroSettings(settings: PomodoroSettings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {}
}

export function loadPomodoroStats(): PomodoroStats {
  const today = new Date().toISOString().slice(0, 10);
  const def: PomodoroStats = { todayDate: today, sessionsCompleted: 0, totalWorkMinutes: 0 };
  if (typeof window === "undefined") return def;
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return def;
    const data: PomodoroStats = JSON.parse(raw);
    if (data.todayDate !== today) {
      return def;
    }
    return data;
  } catch {
    return def;
  }
}

export function recordPomodoroSession(minutes: number): PomodoroStats {
  const stats = loadPomodoroStats();
  const next: PomodoroStats = {
    todayDate: stats.todayDate,
    sessionsCompleted: stats.sessionsCompleted + 1,
    totalWorkMinutes: stats.totalWorkMinutes + minutes,
  };
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STATS_KEY, JSON.stringify(next));
    } catch {}
  }
  return next;
}

/** Phát âm chuông du dương bằng Web Audio API (không phụ thuộc file âm thanh bên ngoài). */
export function playChimeSound(type: "work_end" | "break_end") {
  if (typeof window === "undefined") return;
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    if (type === "work_end") {
      // Chuông hoàn thành phiên học: âm điệu thong thả, du dương 4 nốt C5 - E5 - G5 - C6
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + idx * 0.14);

        gain.gain.setValueAtTime(0, now + idx * 0.14);
        gain.gain.linearRampToValueAtTime(0.2, now + idx * 0.14 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.14 + 0.8);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.14);
        osc.stop(now + idx * 0.14 + 0.85);
      });
    } else {
      // Chuông kết thúc giờ nghỉ: 3 nốt nhẹ nhàng nhắc quay lại học G5 - E5 - C5
      const notes = [783.99, 659.25, 523.25];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + idx * 0.16);

        gain.gain.setValueAtTime(0, now + idx * 0.16);
        gain.gain.linearRampToValueAtTime(0.18, now + idx * 0.16 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.16 + 0.7);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.16);
        osc.stop(now + idx * 0.16 + 0.75);
      });
    }
  } catch (err) {
    console.warn("Could not play pomodoro sound:", err);
  }
}

/** Gửi thông báo trình duyệt nếu được phép */
export function sendBrowserNotification(title: string, body: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission === "granted") {
    try {
      new Notification(title, { body, icon: "/icon-192.png" });
    } catch {}
  }
}
