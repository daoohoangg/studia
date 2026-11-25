"use client";

import { useEffect, useRef, useState } from "react";
import {
  Timer,
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Settings2,
  Volume2,
  VolumeX,
  Coffee,
  Brain,
  X,
  Minus,
  Check,
  Bell,
  Sparkles,
} from "lucide-react";
import {
  DEFAULT_POMODORO_SETTINGS,
  POMODORO_PRESETS,
  PomodoroMode,
  PomodoroSettings,
  loadPomodoroSettings,
  loadPomodoroStats,
  playChimeSound,
  recordPomodoroSession,
  savePomodoroSettings,
  sendBrowserNotification,
} from "@/lib/pomodoro";

export default function PomodoroTimer() {
  const [settings, setSettings] = useState<PomodoroSettings>(DEFAULT_POMODORO_SETTINGS);
  const [mode, setMode] = useState<PomodoroMode>("work");
  const [isRunning, setIsRunning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(DEFAULT_POMODORO_SETTINGS.workMinutes * 60);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [sessionCount, setSessionCount] = useState(1);
  const [stats, setStats] = useState({ todayDate: "", sessionsCompleted: 0, totalWorkMinutes: 0 });

  // Ref lưu trạng thái thời gian thực tế để chống trôi khi ẩn tab
  const leftMsRef = useRef(DEFAULT_POMODORO_SETTINGS.workMinutes * 60 * 1000);
  const endsAtRef = useRef<number | null>(null);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const isRunningRef = useRef(isRunning);
  isRunningRef.current = isRunning;
  const modeRef = useRef(mode);
  modeRef.current = mode;

  // Khởi tạo cài đặt & thống kê từ localStorage
  useEffect(() => {
    const loaded = loadPomodoroSettings();
    setSettings(loaded);
    setSecondsLeft(loaded.workMinutes * 60);
    leftMsRef.current = loaded.workMinutes * 60 * 1000;
    setStats(loadPomodoroStats());

    // Lắng nghe sự kiện mở Pomodoro từ sidebar hoặc nút khác
    const handleOpenEvent = () => setIsExpanded(true);
    window.addEventListener("studia:open-pomodoro", handleOpenEvent);
    return () => window.removeEventListener("studia:open-pomodoro", handleOpenEvent);
  }, []);

  // Lấy tổng số giây của chế độ hiện tại theo settings
  const getTotalSeconds = (m: PomodoroMode, s = settings) => {
    switch (m) {
      case "work":
        return s.workMinutes * 60;
      case "short_break":
        return s.shortBreakMinutes * 60;
      case "long_break":
        return s.longBreakMinutes * 60;
    }
  };

  // Chuyển chế độ
  const switchMode = (newMode: PomodoroMode, autoStart = false) => {
    setMode(newMode);
    setIsRunning(autoStart);
    const totalSec = getTotalSeconds(newMode, settingsRef.current);
    setSecondsLeft(totalSec);
    leftMsRef.current = totalSec * 1000;
    endsAtRef.current = autoStart ? Date.now() + leftMsRef.current : null;
  };

  // Hoàn thành 1 chu kỳ đếm ngược
  const handlePeriodComplete = () => {
    const currentM = modeRef.current;
    const currentS = settingsRef.current;

    if (currentM === "work") {
      if (currentS.soundEnabled) playChimeSound("work_end");
      sendBrowserNotification(
        "🎉 Hoàn thành phiên tập trung!",
        `Bạn đã học xong ${currentS.workMinutes} phút. Hãy nghỉ ngơi một chút nhé!`
      );
      const newStats = recordPomodoroSession(currentS.workMinutes);
      setStats(newStats);

      setSessionCount((prev) => {
        const nextCount = prev + 1;
        const isLong = (nextCount - 1) % currentS.longBreakInterval === 0;
        switchMode(isLong ? "long_break" : "short_break", currentS.autoStartNext);
        return nextCount;
      });
    } else {
      if (currentS.soundEnabled) playChimeSound("break_end");
      sendBrowserNotification(
        "⏰ Hết giờ nghỉ ngơi!",
        "Đã đến lúc quay lại phiên học tập trung tiếp theo."
      );
      switchMode("work", currentS.autoStartNext);
    }
  };

  // Đồng hồ đếm ngược tuyệt đối
  useEffect(() => {
    if (!isRunning) {
      endsAtRef.current = null;
      return;
    }

    if (!endsAtRef.current) {
      endsAtRef.current = Date.now() + leftMsRef.current;
    }

    const tick = () => {
      if (!endsAtRef.current) return;
      const left = Math.max(0, endsAtRef.current - Date.now());
      leftMsRef.current = left;
      const secs = Math.ceil(left / 1000);
      setSecondsLeft(secs);

      if (left <= 0) {
        handlePeriodComplete();
      }
    };

    const intervalId = setInterval(tick, 250);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibility);
      if (endsAtRef.current) {
        leftMsRef.current = Math.max(0, endsAtRef.current - Date.now());
      }
    };
  }, [isRunning]);

  // Cập nhật Document Title khi đang chạy
  useEffect(() => {
    if (!isRunning) return;
    const mins = Math.floor(secondsLeft / 60);
    const secs = secondsLeft % 60;
    const timeFormatted = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    const icon = mode === "work" ? "🎯" : "☕";
    const originalTitle = document.title;
    document.title = `(${timeFormatted}) ${icon} Studia Pomodoro`;

    return () => {
      document.title = originalTitle;
    };
  }, [isRunning, secondsLeft, mode]);

  // Các điều khiển chính
  const togglePlay = () => {
    if (!isRunning) {
      endsAtRef.current = Date.now() + leftMsRef.current;
      setIsRunning(true);
    } else {
      if (endsAtRef.current) {
        leftMsRef.current = Math.max(0, endsAtRef.current - Date.now());
      }
      endsAtRef.current = null;
      setIsRunning(false);
    }
  };

  const resetCurrent = () => {
    setIsRunning(false);
    endsAtRef.current = null;
    const totalSec = getTotalSeconds(mode, settings);
    setSecondsLeft(totalSec);
    leftMsRef.current = totalSec * 1000;
  };

  const skipNext = () => {
    if (mode === "work") {
      const isLong = sessionCount % settings.longBreakInterval === 0;
      switchMode(isLong ? "long_break" : "short_break", false);
    } else {
      switchMode("work", false);
    }
  };

  const applyPreset = (preset: (typeof POMODORO_PRESETS)[number]) => {
    const updated: PomodoroSettings = {
      ...settings,
      workMinutes: preset.work,
      shortBreakMinutes: preset.shortBreak,
      longBreakMinutes: preset.longBreak,
    };
    setSettings(updated);
    savePomodoroSettings(updated);
    if (!isRunning) {
      const totalSec = getTotalSeconds(mode, updated);
      setSecondsLeft(totalSec);
      leftMsRef.current = totalSec * 1000;
    }
  };

  const updateSettingItem = <K extends keyof PomodoroSettings>(key: K, val: PomodoroSettings[K]) => {
    const updated = { ...settings, [key]: val };
    setSettings(updated);
    savePomodoroSettings(updated);
    if (!isRunning) {
      const totalSec = getTotalSeconds(mode, updated);
      setSecondsLeft(totalSec);
      leftMsRef.current = totalSec * 1000;
    }
  };

  const requestNotificationPermission = async () => {
    if ("Notification" in window) {
      const perm = await Notification.requestPermission();
      if (perm === "granted") {
        updateSettingItem("notifyEnabled", true);
      }
    }
  };

  // Tính toán thời gian hiển thị & vòng tròn SVG
  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const timeFormatted = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  const totalSeconds = getTotalSeconds(mode, settings);
  const progressRatio = totalSeconds > 0 ? (totalSeconds - secondsLeft) / totalSeconds : 0;

  // SVG circular ring properties
  const radius = 94;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progressRatio);

  const getModeTheme = () => {
    switch (mode) {
      case "work":
        return {
          title: "Tập trung học",
          color: "var(--brand, #4f46e5)",
          bgTint: "var(--brand-tint, rgba(79, 70, 229, 0.1))",
          icon: Brain,
        };
      case "short_break":
        return {
          title: "Nghỉ ngắn",
          color: "#059669",
          bgTint: "rgba(5, 150, 105, 0.12)",
          icon: Coffee,
        };
      case "long_break":
        return {
          title: "Nghỉ dài",
          color: "#0284c7",
          bgTint: "rgba(2, 132, 199, 0.12)",
          icon: Sparkles,
        };
    }
  };

  const currentTheme = getModeTheme();
  const ModeIcon = currentTheme.icon;

  return (
    <>
      {/* 1. NÚT NỔI THU GỌN (Floating Capsule Pill) */}
      {!isExpanded && (
        <div className="pomo-pill-wrapper" role="region" aria-label="Đồng hồ Pomodoro thu nhỏ">
          <button
            type="button"
            className={`pomo-pill ${isRunning ? "running" : ""} ${mode}`}
            onClick={() => setIsExpanded(true)}
            title="Mở đồng hồ Pomodoro"
          >
            <span className="pomo-pill-icon" style={{ color: currentTheme.color }}>
              <ModeIcon size={16} strokeWidth={2.2} />
            </span>
            <span className="pomo-pill-time">{timeFormatted}</span>
            <span
              className="pomo-pill-quick-action"
              onClick={(e) => {
                e.stopPropagation();
                togglePlay();
              }}
              title={isRunning ? "Tạm dừng" : "Bắt đầu"}
            >
              {isRunning ? <Pause size={14} strokeWidth={2.4} /> : <Play size={14} strokeWidth={2.4} />}
            </span>
          </button>
        </div>
      )}

      {/* 2. BẢNG ĐIỀU KHIỂN ĐẦY ĐỦ (Expanded Modal / Dialog) */}
      {isExpanded && (
        <div
          className="pomo-overlay"
          onClick={() => {
            if (!showSettings) setIsExpanded(false);
          }}
        >
          <div
            className="pomo-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Đồng hồ Pomodoro Studia"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="pomo-header">
              <div className="pomo-title-row">
                <Timer size={20} className="pomo-header-icon" />
                <span className="pomo-title">Pomodoro Studia</span>
                <span className="pomo-cycle-badge">
                  Phiên #{((sessionCount - 1) % settings.longBreakInterval) + 1}/{settings.longBreakInterval}
                </span>
              </div>
              <div className="pomo-header-actions">
                <button
                  type="button"
                  className={`icon-btn ${showSettings ? "active" : ""}`}
                  onClick={() => setShowSettings((s) => !s)}
                  title={showSettings ? "Trở về đồng hồ" : "Cài đặt thời gian"}
                  aria-label="Cài đặt thời gian"
                >
                  <Settings2 size={18} strokeWidth={1.8} />
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => setIsExpanded(false)}
                  title="Thu gọn"
                  aria-label="Thu gọn đồng hồ"
                >
                  <Minus size={18} strokeWidth={1.8} />
                </button>
              </div>
            </div>

            {/* Main Content: Timer vs Settings */}
            {!showSettings ? (
              <div className="pomo-body">
                {/* Mode Selector Tabs */}
                <div className="pomo-tabs">
                  <button
                    type="button"
                    className={`pomo-tab ${mode === "work" ? "active work" : ""}`}
                    onClick={() => switchMode("work")}
                  >
                    <Brain size={15} />
                    <span>Học ({settings.workMinutes}m)</span>
                  </button>
                  <button
                    type="button"
                    className={`pomo-tab ${mode === "short_break" ? "active short_break" : ""}`}
                    onClick={() => switchMode("short_break")}
                  >
                    <Coffee size={15} />
                    <span>Nghỉ ngắn ({settings.shortBreakMinutes}m)</span>
                  </button>
                  <button
                    type="button"
                    className={`pomo-tab ${mode === "long_break" ? "active long_break" : ""}`}
                    onClick={() => switchMode("long_break")}
                  >
                    <Sparkles size={15} />
                    <span>Nghỉ dài ({settings.longBreakMinutes}m)</span>
                  </button>
                </div>

                {/* Circular Progress & Big Countdown Display */}
                <div className="pomo-clock-container">
                  <svg className="pomo-svg" viewBox="0 0 220 220" width="220" height="220">
                    {/* Background Track */}
                    <circle
                      cx="110"
                      cy="110"
                      r={radius}
                      className="pomo-track"
                      strokeWidth="8"
                      fill="none"
                    />
                    {/* Animated Progress Ring */}
                    <circle
                      cx="110"
                      cy="110"
                      r={radius}
                      className="pomo-indicator"
                      strokeWidth="8"
                      fill="none"
                      stroke={currentTheme.color}
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                      transform="rotate(-90 110 110)"
                    />
                  </svg>

                  <div className="pomo-clock-text">
                    <span className="pomo-mode-label" style={{ color: currentTheme.color }}>
                      {currentTheme.title}
                    </span>
                    <span className="pomo-time-display">{timeFormatted}</span>
                    <span className="pomo-status-label">
                      {isRunning ? "Đang đếm ngược…" : "Tạm dừng"}
                    </span>
                  </div>
                </div>

                {/* Primary Action Buttons */}
                <div className="pomo-controls">
                  <button
                    type="button"
                    className="pomo-btn-secondary icon-btn-lg"
                    onClick={resetCurrent}
                    title="Đặt lại phiên này"
                    aria-label="Đặt lại phiên này"
                  >
                    <RotateCcw size={20} strokeWidth={2} />
                  </button>

                  <button
                    type="button"
                    className={`pomo-btn-play ${isRunning ? "running" : ""}`}
                    onClick={togglePlay}
                    style={{ backgroundColor: currentTheme.color }}
                    aria-label={isRunning ? "Tạm dừng" : "Bắt đầu"}
                  >
                    {isRunning ? <Pause size={28} strokeWidth={2.4} /> : <Play size={28} strokeWidth={2.4} style={{ marginLeft: 3 }} />}
                  </button>

                  <button
                    type="button"
                    className="pomo-btn-secondary icon-btn-lg"
                    onClick={skipNext}
                    title="Chuyển sang phiên tiếp theo"
                    aria-label="Chuyển sang phiên tiếp theo"
                  >
                    <SkipForward size={20} strokeWidth={2} />
                  </button>
                </div>

                {/* Quick Presets */}
                <div className="pomo-presets-row">
                  <span className="pomo-presets-label">Gợi ý nhịp:</span>
                  <div className="pomo-presets-list">
                    {POMODORO_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        className={`pomo-preset-btn ${
                          settings.workMinutes === preset.work &&
                          settings.shortBreakMinutes === preset.shortBreak
                            ? "active"
                            : ""
                        }`}
                        onClick={() => applyPreset(preset)}
                        title={preset.desc}
                      >
                        {preset.name} ({preset.work}/{preset.shortBreak}m)
                      </button>
                    ))}
                  </div>
                </div>

                {/* Daily Statistics bar */}
                <div className="pomo-stats-strip">
                  <span>Hôm nay: <b>{stats.sessionsCompleted}</b> phiên hoàn thành</span>
                  <span>Tổng: <b>{stats.totalWorkMinutes}</b> phút tập trung</span>
                </div>
              </div>
            ) : (
              /* Settings Panel View */
              <div className="pomo-settings-panel">
                <div className="pomo-settings-heading">
                  <b>Tùy chỉnh thời gian &amp; thông báo</b>
                  <p className="meta">Thiết lập nhịp học phù hợp với thói quen của bạn</p>
                </div>

                {/* Sliders for Custom Durations */}
                <div className="pomo-setting-group">
                  <div className="pomo-setting-row">
                    <label htmlFor="pomo-work-input">Thời gian học tập trung (phút)</label>
                    <div className="pomo-input-wrap">
                      <input
                        id="pomo-work-input"
                        type="number"
                        min="1"
                        max="120"
                        value={settings.workMinutes}
                        onChange={(e) => updateSettingItem("workMinutes", Math.max(1, Math.min(120, Number(e.target.value) || 1)))}
                        className="pomo-num-input"
                      />
                    </div>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="90"
                    step="5"
                    value={settings.workMinutes}
                    onChange={(e) => updateSettingItem("workMinutes", Number(e.target.value))}
                    className="pomo-range-slider"
                  />
                </div>

                <div className="pomo-setting-group">
                  <div className="pomo-setting-row">
                    <label htmlFor="pomo-short-break-input">Thời gian nghỉ ngắn (phút)</label>
                    <div className="pomo-input-wrap">
                      <input
                        id="pomo-short-break-input"
                        type="number"
                        min="1"
                        max="30"
                        value={settings.shortBreakMinutes}
                        onChange={(e) => updateSettingItem("shortBreakMinutes", Math.max(1, Math.min(30, Number(e.target.value) || 1)))}
                        className="pomo-num-input"
                      />
                    </div>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="20"
                    step="1"
                    value={settings.shortBreakMinutes}
                    onChange={(e) => updateSettingItem("shortBreakMinutes", Number(e.target.value))}
                    className="pomo-range-slider"
                  />
                </div>

                <div className="pomo-setting-group">
                  <div className="pomo-setting-row">
                    <label htmlFor="pomo-long-break-input">Thời gian nghỉ dài (phút)</label>
                    <div className="pomo-input-wrap">
                      <input
                        id="pomo-long-break-input"
                        type="number"
                        min="5"
                        max="60"
                        value={settings.longBreakMinutes}
                        onChange={(e) => updateSettingItem("longBreakMinutes", Math.max(5, Math.min(60, Number(e.target.value) || 5)))}
                        className="pomo-num-input"
                      />
                    </div>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="45"
                    step="5"
                    value={settings.longBreakMinutes}
                    onChange={(e) => updateSettingItem("longBreakMinutes", Number(e.target.value))}
                    className="pomo-range-slider"
                  />
                </div>

                <div className="pomo-setting-group">
                  <div className="pomo-setting-row">
                    <label htmlFor="pomo-interval-input">Chu kỳ nghỉ dài (số phiên học)</label>
                    <div className="pomo-input-wrap">
                      <input
                        id="pomo-interval-input"
                        type="number"
                        min="2"
                        max="8"
                        value={settings.longBreakInterval}
                        onChange={(e) => updateSettingItem("longBreakInterval", Math.max(2, Math.min(8, Number(e.target.value) || 4)))}
                        className="pomo-num-input"
                      />
                    </div>
                  </div>
                </div>

                {/* Toggles */}
                <div className="pomo-toggles-list">
                  <label className="pomo-toggle-item">
                    <div className="pomo-toggle-info">
                      <div className="pomo-toggle-title">
                        {settings.soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                        <span>Âm thanh chuông báo khi hết giờ</span>
                      </div>
                      <span className="meta">Phát âm chuông nhẹ nhàng bằng Web Audio</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.soundEnabled}
                      onChange={(e) => updateSettingItem("soundEnabled", e.target.checked)}
                      className="pomo-checkbox"
                    />
                  </label>

                  <label className="pomo-toggle-item">
                    <div className="pomo-toggle-info">
                      <div className="pomo-toggle-title">
                        <Bell size={16} />
                        <span>Thông báo màn hình (Desktop Notification)</span>
                      </div>
                      <span className="meta">Báo khi bạn đang mở tab khác</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.notifyEnabled}
                      onChange={(e) => {
                        if (e.target.checked) {
                          requestNotificationPermission();
                        } else {
                          updateSettingItem("notifyEnabled", false);
                        }
                      }}
                      className="pomo-checkbox"
                    />
                  </label>

                  <label className="pomo-toggle-item">
                    <div className="pomo-toggle-info">
                      <div className="pomo-toggle-title">
                        <Sparkles size={16} />
                        <span>Tự động chuyển phiên tiếp theo</span>
                      </div>
                      <span className="meta">Tự động đếm giờ nghỉ hoặc giờ học tiếp theo</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.autoStartNext}
                      onChange={(e) => updateSettingItem("autoStartNext", e.target.checked)}
                      className="pomo-checkbox"
                    />
                  </label>
                </div>

                {/* Button Save / Done */}
                <button
                  type="button"
                  className="st-btn st-btn-primary st-btn-block"
                  style={{ marginTop: 16 }}
                  onClick={() => setShowSettings(false)}
                >
                  <Check size={16} />
                  <span>Xong &amp; áp dụng</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
