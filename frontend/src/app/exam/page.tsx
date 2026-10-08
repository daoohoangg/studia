"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, Headphones, BookOpen, PenLine, Mic, ChevronRight, AlertCircle, Loader2, CheckCircle2 } from "lucide-react";

const API = "http://localhost:8000/api/v1";

type ExamType = "full" | "cambridge21_test1" | "cambridge21_test2" | "cambridge21_test3" | "cambridge21_test4" | "listening" | "reading" | "writing" | "speaking";
type ExamMode = "academic" | "general";

const EXAM_CONFIGS = {
  full: {
    label: "Full Mock Test",
    desc: "Listening + Reading + Writing + Speaking",
    duration: "2 giờ 45 phút",
    icon: "🎯",
    sections: [
      { name: "Listening", time: "30 phút", questions: "40 câu", icon: Headphones },
      { name: "Reading",   time: "60 phút", questions: "40 câu", icon: BookOpen },
      { name: "Writing",   time: "60 phút", questions: "2 Tasks", icon: PenLine },
      { name: "Speaking",  time: "15 phút", questions: "3 Parts", icon: Mic },
    ],
    color: "#1e40af",
    bg: "linear-gradient(135deg, #1e3a8a 0%, #4c1d95 100%)",
  },
  cambridge21_test1: {
    label: "Cambridge 21 - Test 1",
    desc: "Đề thi chuẩn từ Cambridge IELTS 21 (Audio + Đề thật)",
    duration: "2 giờ 45 phút",
    icon: "📚",
    sections: [
      { name: "Listening", time: "30 phút", questions: "40 câu", icon: Headphones },
      { name: "Reading",   time: "60 phút", questions: "40 câu", icon: BookOpen },
      { name: "Writing",   time: "60 phút", questions: "2 Tasks", icon: PenLine },
      { name: "Speaking",  time: "15 phút", questions: "3 Parts", icon: Mic },
    ],
    color: "#b91c1c",
    bg: "linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)",
  },
  cambridge21_test2: {
    label: "Cambridge 21 - Test 2",
    desc: "Đề thi chuẩn từ Cambridge IELTS 21 (Audio + Đề thật)",
    duration: "2 giờ 45 phút",
    icon: "📚",
    sections: [
      { name: "Listening", time: "30 phút", questions: "40 câu", icon: Headphones },
      { name: "Reading",   time: "60 phút", questions: "40 câu", icon: BookOpen },
      { name: "Writing",   time: "60 phút", questions: "2 Tasks", icon: PenLine },
      { name: "Speaking",  time: "15 phút", questions: "3 Parts", icon: Mic },
    ],
    color: "#b91c1c",
    bg: "linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)",
  },
  cambridge21_test3: {
    label: "Cambridge 21 - Test 3",
    desc: "Đề thi chuẩn từ Cambridge IELTS 21 (Audio + Đề thật)",
    duration: "2 giờ 45 phút",
    icon: "📚",
    sections: [
      { name: "Listening", time: "30 phút", questions: "40 câu", icon: Headphones },
      { name: "Reading",   time: "60 phút", questions: "40 câu", icon: BookOpen },
      { name: "Writing",   time: "60 phút", questions: "2 Tasks", icon: PenLine },
      { name: "Speaking",  time: "15 phút", questions: "3 Parts", icon: Mic },
    ],
    color: "#b91c1c",
    bg: "linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)",
  },
  cambridge21_test4: {
    label: "Cambridge 21 - Test 4",
    desc: "Đề thi chuẩn từ Cambridge IELTS 21 (Audio + Đề thật)",
    duration: "2 giờ 45 phút",
    icon: "📚",
    sections: [
      { name: "Listening", time: "30 phút", questions: "40 câu", icon: Headphones },
      { name: "Reading",   time: "60 phút", questions: "40 câu", icon: BookOpen },
      { name: "Writing",   time: "60 phút", questions: "2 Tasks", icon: PenLine },
      { name: "Speaking",  time: "15 phút", questions: "3 Parts", icon: Mic },
    ],
    color: "#b91c1c",
    bg: "linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)",
  },
  listening: {
    label: "Listening Only",
    desc: "Section luyện tập Listening riêng lẻ",
    duration: "30 phút",
    icon: "🎧",
    sections: [{ name: "Listening", time: "30 phút", questions: "40 câu", icon: Headphones }],
    color: "#0891b2",
    bg: "linear-gradient(135deg, #164e63 0%, #0e7490 100%)",
  },
  reading: {
    label: "Reading Only",
    desc: "Section luyện tập Reading riêng lẻ",
    duration: "60 phút",
    icon: "📖",
    sections: [{ name: "Reading", time: "60 phút", questions: "40 câu", icon: BookOpen }],
    color: "#059669",
    bg: "linear-gradient(135deg, #064e3b 0%, #065f46 100%)",
  },
  writing: {
    label: "Writing Only",
    desc: "Task 1 + Task 2 riêng lẻ",
    duration: "60 phút",
    icon: "✍️",
    sections: [{ name: "Writing", time: "60 phút", questions: "2 Tasks", icon: PenLine }],
    color: "#d97706",
    bg: "linear-gradient(135deg, #78350f 0%, #92400e 100%)",
  },
  speaking: {
    label: "Speaking Only",
    desc: "Phỏng vấn Speaking với AI Examiner",
    duration: "15 phút",
    icon: "🎙️",
    sections: [{ name: "Speaking", time: "15 phút", questions: "3 Parts", icon: Mic }],
    color: "#7c3aed",
    bg: "linear-gradient(135deg, #4c1d95 0%, #5b21b6 100%)",
  },
};

const INSTRUCTIONS = [
  "Bài thi sẽ bắt đầu ngay sau khi bạn bấm Start Test.",
  "Không thể thoát ra Dashboard trong khi đang thi.",
  "Đồng hồ đếm ngược sẽ bắt đầu ngay lập tức.",
  "Bài sẽ tự động nộp khi hết thời gian.",
  "Không có đáp án hay gợi ý trong khi thi.",
  "Bạn có thể điều hướng qua lại giữa các câu bằng Question Navigator.",
];

export default function ExamLobbyPage() {
  const router = useRouter();
  const [examType, setExamType] = useState<ExamType>("full");
  const [examMode, setExamMode] = useState<ExamMode>("academic");
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState(false);

  const config = EXAM_CONFIGS[examType];

  const handleStartTest = async () => {
    if (!checked) return;
    setLoading(true);

    if (examType.startsWith("cambridge21")) {
      router.push(`/exam/demo?type=${examType}`);
      return;
    }

    try {
      const res = await fetch(`${API}/exam/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exam_type: examType, exam_mode: examMode }),
      });
      if (res.ok) {
        const data = await res.json();
        const sessionId = data.session?.session_id;
        if (sessionId) {
          router.push(`/exam/${sessionId}`);
        }
      } else {
        // Fallback: demo mode without backend
        router.push(`/exam/demo?type=${examType}&mode=${examMode}`);
      }
    } catch {
      // Demo mode fallback
      router.push(`/exam/demo?type=${examType}&mode=${examMode}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="exam-lobby">
      <div style={{ width: "100%", maxWidth: "900px" }}>
        {/* Top Header */}
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: "12px",
            background: "var(--bg-card)", border: "1px solid var(--border-subtle)",
            padding: "8px 20px", borderRadius: "99px", marginBottom: "20px"
          }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent-emerald)" }} />
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>
              IELTS Computer-Delivered Simulation
            </span>
          </div>
          <h1 style={{ fontSize: "2.8rem", fontWeight: "800", color: "var(--text-primary)", fontFamily: "Outfit, sans-serif", letterSpacing: "-0.02em", marginBottom: "10px" }}>
            IELTS Mock Test Room
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "1.05rem" }}>
            Trải nghiệm phòng thi IELTS mô phỏng như thi thật. Không gợi ý. Không tra từ điển. Không đáp án.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "24px", alignItems: "start" }}>
          {/* Left — Config */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Exam Mode */}
            <div className="glass-panel" style={{ padding: "24px" }}>
              <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "12px" }}>
                Loại bài thi
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                {(["academic", "general"] as ExamMode[]).map(m => (
                  <button key={m} onClick={() => setExamMode(m)} style={{
                    flex: 1, padding: "12px", borderRadius: "12px",
                    border: `2px solid ${examMode === m ? "var(--border-glow)" : "var(--border-subtle)"}`,
                    background: examMode === m ? "rgba(99,102,241,0.15)" : "transparent",
                    color: examMode === m ? "var(--text-primary)" : "var(--text-muted)",
                    cursor: "pointer", fontWeight: 700, fontSize: "0.85rem",
                    transition: "all 0.15s ease"
                  }}>
                    {m === "academic" ? "Academic" : "General Training"}
                  </button>
                ))}
              </div>
            </div>

            {/* Exam Type Grid */}
            <div className="glass-panel" style={{ padding: "24px" }}>
              <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "16px" }}>
                Chọn bài thi
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                {(Object.entries(EXAM_CONFIGS) as [ExamType, typeof EXAM_CONFIGS.full][]).map(([key, cfg]) => (
                  <button key={key} onClick={() => setExamType(key)} style={{
                    padding: "16px",
                    borderRadius: "14px",
                    border: `2px solid ${examType === key ? "var(--border-glow)" : "var(--border-subtle)"}`,
                    background: examType === key ? "rgba(99,102,241,0.12)" : "var(--bg-card)",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.15s ease",
                    display: "flex", flexDirection: "column", gap: "6px",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "space-between" }}>
                      <span style={{ fontSize: "1.4rem" }}>{cfg.icon}</span>
                      {examType === key && (
                        <div style={{ width: 18, height: 18, borderRadius: "50%", background: "var(--accent-indigo)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <CheckCircle2 size={12} color="#fff" />
                        </div>
                      )}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--text-primary)" }}>{cfg.label}</div>
                    <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{cfg.duration}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Instructions */}
            <div className="glass-panel" style={{ padding: "24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
                <AlertCircle size={16} color="var(--accent-amber)" />
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--accent-amber)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  Quy định phòng thi
                </span>
              </div>
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "8px" }}>
                {INSTRUCTIONS.map((inst, i) => (
                  <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: "10px", fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                    <span style={{ color: "var(--text-muted)", fontWeight: 700, flexShrink: 0 }}>{i + 1}.</span>
                    {inst}
                  </li>
                ))}
              </ul>

              <div
                onClick={() => setChecked(c => !c)}
                style={{
                  display: "flex", alignItems: "center", gap: "12px",
                  marginTop: "20px", cursor: "pointer", padding: "14px 16px",
                  borderRadius: "12px",
                  background: checked ? "rgba(99,102,241,0.1)" : "var(--bg-card)",
                  border: `1.5px solid ${checked ? "var(--border-glow)" : "var(--border-subtle)"}`,
                  transition: "all 0.15s ease",
                }}
              >
                <div style={{
                  width: 20, height: 20, borderRadius: 6,
                  border: `2px solid ${checked ? "var(--accent-indigo)" : "var(--text-muted)"}`,
                  background: checked ? "var(--accent-indigo)" : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0, transition: "all 0.15s ease"
                }}>
                  {checked && <CheckCircle2 size={12} color="#fff" />}
                </div>
                <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                  Tôi đã đọc và đồng ý với các quy định của phòng thi
                </span>
              </div>
            </div>
          </div>

          {/* Right — Summary & Start */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", position: "sticky", top: "20px" }}>
            {/* Selected Test Summary */}
            <div style={{
              borderRadius: "20px",
              padding: "28px",
              background: config.bg,
              color: "#fff",
            }}>
              <div style={{ fontSize: "2.5rem", marginBottom: "12px" }}>{config.icon}</div>
              <div style={{ fontSize: "1.25rem", fontWeight: 800, fontFamily: "Outfit, sans-serif", marginBottom: "4px" }}>
                {examMode === "academic" ? "IELTS Academic" : "IELTS General"} — {config.label}
              </div>
              <div style={{ fontSize: "0.82rem", opacity: 0.8, marginBottom: "20px" }}>{config.desc}</div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
                <Clock size={14} />
                <span style={{ fontSize: "0.85rem", fontWeight: 700 }}>{config.duration}</span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {config.sections.map((sec, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    background: "rgba(255,255,255,0.1)",
                    padding: "10px 14px", borderRadius: "10px"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.82rem" }}>
                      <sec.icon size={14} />
                      <span style={{ fontWeight: 600 }}>{sec.name}</span>
                    </div>
                    <div style={{ fontSize: "0.72rem", opacity: 0.8 }}>{sec.time} · {sec.questions}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Start Button */}
            <button
              onClick={handleStartTest}
              disabled={!checked || loading}
              style={{
                width: "100%",
                padding: "18px",
                borderRadius: "16px",
                border: "none",
                background: checked
                  ? "var(--gradient-main)"
                  : "var(--bg-card)",
                color: checked ? "#fff" : "var(--text-muted)",
                fontSize: "1rem",
                fontWeight: 800,
                cursor: checked && !loading ? "pointer" : "not-allowed",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                transition: "all 0.2s ease",
                boxShadow: checked ? "0 8px 32px rgba(79,70,229,0.4)" : "none",
                fontFamily: "Outfit, sans-serif",
                letterSpacing: "0.02em",
              }}
            >
              {loading ? (
                <><Loader2 size={18} className="spin" /> Đang chuẩn bị...</>
              ) : (
                <><span>Bắt Đầu Thi</span> <ChevronRight size={20} /></>
              )}
            </button>

            {!checked && (
              <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", textAlign: "center" }}>
                Vui lòng đồng ý với quy định phòng thi để tiếp tục
              </p>
            )}

            <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", textAlign: "center", lineHeight: 1.6 }}>
              Bài thi mô phỏng IELTS Computer-Delivered<br />
              Dữ liệu câu hỏi có thể thay đổi
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
