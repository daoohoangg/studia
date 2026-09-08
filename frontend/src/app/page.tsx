"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Flame, BookOpen, CreditCard, CheckSquare, ArrowRight,
  Zap, TrendingUp, Clock, Target, Sparkles, BarChart3, RefreshCw
} from "lucide-react";

const API = "http://localhost:8000/api/v1";

const greetings = () => {
  const h = new Date().getHours();
  if (h < 12) return "Chào buổi sáng";
  if (h < 18) return "Chào buổi chiều";
  return "Chào buổi tối";
};

const taskIcon = (type: string) => {
  const icons: Record<string, string> = {
    lesson: "📖", quiz: "📝", flashcard_review: "🃏", spaced_repetition: "🔄"
  };
  return icons[type] || "📌";
};

const taskBg: Record<string, string> = {
  lesson: "rgba(99,102,241,0.1)",
  quiz: "rgba(245,158,11,0.1)",
  flashcard_review: "rgba(139,92,246,0.1)",
  spaced_repetition: "rgba(16,185,129,0.1)",
};

export default function HomePage() {
  const [todayData, setTodayData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [completedTasks, setCompletedTasks] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetchTodayPlan();
  }, []);

  const fetchTodayPlan = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/learning-paths/today`);
      if (res.ok) setTodayData(await res.json());
    } catch {
      // Fallback data
      setTodayData({
        has_plan: false,
        streak_days: 0,
        total_minutes: 0,
        tasks: [],
        knowledge_profile: { overall_mastery: 0, total_topics: 0 }
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleTask = (idx: number) => {
    setCompletedTasks(prev => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  const tasks = todayData?.tasks || [];
  const streak = todayData?.streak_days || 0;
  const totalMin = todayData?.total_minutes || 0;
  const profile = todayData?.knowledge_profile || {};
  const doneTasks = completedTasks.size;
  const progressPct = tasks.length > 0 ? Math.round((doneTasks / tasks.length) * 100) : 0;

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "24px", maxWidth: "900px", margin: "0 auto" }}>
        <div className="skeleton" style={{ height: 80, borderRadius: 20 }} />
        <div className="skeleton" style={{ height: 300, borderRadius: 20 }} />
        <div className="skeleton" style={{ height: 200, borderRadius: 20 }} />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px", maxWidth: "900px", margin: "0 auto" }}>

      {/* Greeting Header */}
      <div className="glass-panel fade-in-up" style={{ padding: "28px 32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "4px" }}>
            {greetings()}, Bạn 👋
          </div>
          <h1 style={{ fontSize: "2rem", fontWeight: "800", fontFamily: "Outfit, sans-serif" }}>
            {tasks.length > 0
              ? <>Hôm nay bạn có <span className="text-gradient">{tasks.length} nhiệm vụ</span></>
              : <><span className="text-gradient">Sẵn sàng học hôm nay?</span></>
            }
          </h1>
          {tasks.length > 0 && (
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginTop: "6px" }}>
              {totalMin} phút · {tasks.length} bài tập · {progressPct}% hoàn thành
            </p>
          )}
        </div>

        <div style={{ display: "flex", gap: "12px", flexShrink: 0 }}>
          {/* Streak */}
          <div style={{
            background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)",
            borderRadius: "16px", padding: "16px 20px", textAlign: "center"
          }}>
            <div style={{ fontSize: "1.6rem" }}>🔥</div>
            <div style={{ fontSize: "1.4rem", fontWeight: "800", color: "#fbbf24", fontFamily: "Outfit, sans-serif" }}>{streak}</div>
            <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontWeight: 600 }}>STREAK</div>
          </div>
          {/* Overall mastery */}
          <div style={{
            background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.25)",
            borderRadius: "16px", padding: "16px 20px", textAlign: "center"
          }}>
            <div style={{ fontSize: "1.6rem" }}>🧠</div>
            <div style={{ fontSize: "1.4rem", fontWeight: "800", color: "#818cf8", fontFamily: "Outfit, sans-serif" }}>
              {profile.overall_mastery?.toFixed(0) || 0}%
            </div>
            <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontWeight: 600 }}>MASTERY</div>
          </div>
        </div>
      </div>

      {/* Today's Progress */}
      {tasks.length > 0 && (
        <div className="glass-panel fade-in-up" style={{ padding: "24px 28px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px" }}>
              <Target size={18} color="var(--accent-indigo)" />
              Tiến độ hôm nay
            </h2>
            <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              {doneTasks}/{tasks.length} hoàn thành
            </span>
          </div>
          <div className="progress-bar-bg" style={{ height: "10px", marginBottom: "8px" }}>
            <div className="progress-bar-fill" style={{ width: `${progressPct}%` }} />
          </div>
          <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
            {progressPct === 100 ? "🎉 Hoàn thành xuất sắc hôm nay!" :
              progressPct > 50 ? "💪 Tiếp tục cố lên, gần xong rồi!" :
              "⚡ Bắt đầu thôi!"}
          </div>
        </div>
      )}

      {/* Today's Tasks */}
      {tasks.length > 0 ? (
        <div className="glass-panel fade-in-up" style={{ padding: "24px 28px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <h2 style={{ fontSize: "1.15rem", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px" }}>
              <Zap size={18} color="var(--accent-amber)" />
              Kế hoạch hôm nay
            </h2>
            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
              <Clock size={12} style={{ display: "inline", marginRight: 4 }} />{totalMin} phút
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {tasks.map((task: any, idx: number) => {
              const done = completedTasks.has(idx);
              return (
                <div
                  key={idx}
                  className={`task-item${done ? " completed" : ""}`}
                  onClick={() => toggleTask(idx)}
                  style={{ cursor: "pointer" }}
                >
                  <div className="task-icon" style={{ background: taskBg[task.type] || "rgba(255,255,255,0.05)" }}>
                    {taskIcon(task.type)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: "600", fontSize: "0.95rem", color: done ? "var(--text-muted)" : "var(--text-primary)" }}>
                      {task.topic_name}
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "2px" }}>
                      {task.type === "lesson" ? "Học bài mới" :
                        task.type === "quiz" ? `Làm ${task.question_count || 5} câu hỏi` :
                        task.type === "flashcard_review" ? `Ôn ${task.card_count || 10} flashcard` :
                        "Spaced Repetition"} · {task.duration_min} phút
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    {task.current_mastery !== undefined && (
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        {task.current_mastery.toFixed(0)}% mastery
                      </span>
                    )}
                    <div style={{
                      width: "24px", height: "24px", borderRadius: "50%",
                      border: `2px solid ${done ? "var(--accent-emerald)" : "rgba(255,255,255,0.2)"}`,
                      background: done ? "var(--accent-emerald)" : "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0,
                    }}>
                      {done && <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                      </svg>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* No plan — Onboarding CTA */
        <div className="glass-panel fade-in-up" style={{ padding: "48px 40px", textAlign: "center" }}>
          <div style={{ fontSize: "4rem", marginBottom: "16px" }}>📚</div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: "800", marginBottom: "10px", fontFamily: "Outfit, sans-serif" }}>
            Chưa có lịch học hôm nay
          </h2>
          <p style={{ color: "var(--text-secondary)", maxWidth: "420px", margin: "0 auto 28px", lineHeight: "1.6" }}>
            Upload một quyển sách, đặt mục tiêu, và Studia sẽ tự động tạo lịch học cá nhân hóa cho bạn.
          </p>
          <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
            <Link href="/books" className="btn-primary" style={{ padding: "12px 24px" }}>
              <BookOpen size={18} /> Upload Sách Đầu Tiên
            </Link>
            <button onClick={fetchTodayPlan} className="btn-secondary">
              <RefreshCw size={16} /> Làm mới
            </button>
          </div>
        </div>
      )}

      {/* Knowledge Profile */}
      {profile.topics && profile.topics.length > 0 && (
        <div className="glass-panel fade-in-up" style={{ padding: "24px 28px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <h2 style={{ fontSize: "1.15rem", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px" }}>
              <BarChart3 size={18} color="var(--accent-cyan)" />
              Knowledge Profile
            </h2>
            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{profile.total_topics} topics</span>
          </div>

          <div className="knowledge-bar-wrap">
            {profile.topics.slice(0, 6).map((t: any, i: number) => {
              const color = t.mastery_score >= 80 ? "#10b981" : t.mastery_score >= 50 ? "#6366f1" : t.mastery_score >= 30 ? "#f59e0b" : "#f43f5e";
              return (
                <div key={i} className="knowledge-bar-row">
                  <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {t.topic_name}
                  </span>
                  <div className="knowledge-bar-track">
                    <div className="knowledge-bar-fill" style={{ width: `${t.mastery_score}%`, background: color }} />
                  </div>
                  <span style={{ fontSize: "0.8rem", fontWeight: "700", color, textAlign: "right" }}>
                    {t.mastery_score.toFixed(0)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
        {[
          { href: "/books", icon: "📚", label: "Thư Viện", sub: "Upload & quản lý sách", color: "rgba(99,102,241,0.1)", border: "rgba(99,102,241,0.25)" },
          { href: "/flashcards", icon: "🃏", label: "Flashcards", sub: "Ôn tập nhanh hôm nay", color: "rgba(139,92,246,0.1)", border: "rgba(139,92,246,0.25)" },
          { href: "/tutor", icon: "🤖", label: "AI Tutor", sub: "Hỏi đáp từ nội dung sách", color: "rgba(56,189,248,0.1)", border: "rgba(56,189,248,0.25)" },
        ].map((item) => (
          <Link key={item.href} href={item.href} style={{
            textDecoration: "none", background: item.color, border: `1px solid ${item.border}`,
            borderRadius: "16px", padding: "20px", display: "flex", flexDirection: "column", gap: "8px",
            transition: "all 0.25s ease", color: "inherit",
          }}
            onMouseEnter={e => (e.currentTarget.style.transform = "translateY(-3px)")}
            onMouseLeave={e => (e.currentTarget.style.transform = "none")}
          >
            <div style={{ fontSize: "1.8rem" }}>{item.icon}</div>
            <div style={{ fontWeight: "700", fontSize: "1rem", fontFamily: "Outfit, sans-serif" }}>{item.label}</div>
            <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{item.sub}</div>
            <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "var(--text-secondary)", fontSize: "0.78rem", marginTop: "4px" }}>
              Vào ngay <ArrowRight size={12} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
