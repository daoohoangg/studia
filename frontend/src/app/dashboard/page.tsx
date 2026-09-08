"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { BarChart3, TrendingUp, BookOpen, RefreshCw, CreditCard, MessageSquare, Flame, Target, AlertTriangle } from "lucide-react";

const API = "http://localhost:8000/api/v1";

export default function DashboardPage() {
  const [profile, setProfile] = useState<any>(null);
  const [weakTopics, setWeakTopics] = useState<any[]>([]);
  const [reviewStats, setReviewStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [todayRes, weakRes, statsRes] = await Promise.all([
        fetch(`${API}/learning-paths/today`),
        fetch(`${API}/quizzes/weak-topics`),
        fetch(`${API}/reviews/stats`)
      ]);
      if (todayRes.ok) { const d = await todayRes.json(); setProfile(d.knowledge_profile); }
      if (weakRes.ok) { const d = await weakRes.json(); setWeakTopics(d.weak_topics || []); }
      if (statsRes.ok) setReviewStats(await statsRes.json());
    } catch {}
    setLoading(false);
  };

  const masteredCount = profile?.mastered_count || 0;
  const totalTopics = profile?.total_topics || 0;
  const overallMastery = profile?.overall_mastery || 0;
  const avgRetention = reviewStats?.avg_retention || 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px", maxWidth: "1000px" }}>
      {/* Header */}
      <div>
        <span className="badge badge-indigo" style={{ marginBottom: "10px" }}>
          <BarChart3 size={13} /> Analytics
        </span>
        <h1 style={{ fontSize: "2.2rem", fontWeight: "800", fontFamily: "Outfit, sans-serif" }}>
          Tổng quan học tập
        </h1>
        <p style={{ color: "var(--text-secondary)", marginTop: "4px" }}>
          Theo dõi tiến trình và trạng thái kiến thức của bạn
        </p>
      </div>

      {/* Stats Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" }}>
        {[
          { icon: "🧠", label: "Tổng Mastery", value: `${overallMastery.toFixed(0)}%`, color: "#818cf8", bg: "rgba(99,102,241,0.1)" },
          { icon: "📚", label: "Topics đã học", value: `${masteredCount}/${totalTopics}`, color: "#34d399", bg: "rgba(16,185,129,0.1)" },
          { icon: "🛡️", label: "Tỷ lệ ghi nhớ", value: `${avgRetention.toFixed(1)}%`, color: "#38bdf8", bg: "rgba(56,189,248,0.1)" },
          { icon: "⚠️", label: "Cần ôn tập", value: weakTopics.length, color: "#fbbf24", bg: "rgba(245,158,11,0.1)" },
        ].map(s => (
          <div key={s.label} className="stat-card" style={{ flexDirection: "column", alignItems: "flex-start", gap: "6px", background: s.bg, borderColor: "transparent" }}>
            {loading ? <div className="skeleton" style={{ width: "100%", height: 60 }} /> : (
              <>
                <span style={{ fontSize: "1.8rem" }}>{s.icon}</span>
                <span style={{ fontSize: "1.6rem", fontWeight: "800", color: s.color, fontFamily: "Outfit, sans-serif" }}>{s.value}</span>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>{s.label}</span>
              </>
            )}
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "24px" }}>
        {/* Knowledge Profile */}
        <div className="glass-panel" style={{ padding: "24px" }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: "700", marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
            <TrendingUp size={18} color="var(--accent-cyan)" />
            Knowledge Profile
          </h2>

          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 24 }} />)}
            </div>
          ) : profile?.topics?.length > 0 ? (
            <div className="knowledge-bar-wrap">
              {profile.topics.map((t: any, i: number) => {
                const clr = t.mastery_score >= 80 ? "#10b981" : t.mastery_score >= 50 ? "#6366f1" : t.mastery_score >= 30 ? "#f59e0b" : "#f43f5e";
                return (
                  <div key={i} className="knowledge-bar-row">
                    <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={t.topic_name}>
                      {t.topic_name}
                    </span>
                    <div className="knowledge-bar-track">
                      <div className="knowledge-bar-fill" style={{ width: `${t.mastery_score}%`, background: clr }} />
                    </div>
                    <span style={{ fontSize: "0.78rem", fontWeight: 700, color: clr, textAlign: "right" }}>
                      {t.mastery_score.toFixed(0)}%
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "24px", color: "var(--text-muted)" }}>
              <BookOpen size={28} style={{ marginBottom: "10px", opacity: 0.5 }} />
              <p style={{ fontSize: "0.875rem" }}>Upload sách và bắt đầu học để xem Knowledge Profile</p>
              <Link href="/books" className="btn-primary" style={{ marginTop: "14px", display: "inline-flex" }}>
                Upload Sách
              </Link>
            </div>
          )}
        </div>

        {/* Weak Topics */}
        <div className="glass-panel" style={{ padding: "24px" }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: "700", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
            <AlertTriangle size={18} color="var(--accent-amber)" />
            Cần ôn tập thêm
          </h2>

          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 56 }} />)}
            </div>
          ) : weakTopics.length === 0 ? (
            <div style={{ textAlign: "center", padding: "24px", color: "var(--text-muted)" }}>
              <div style={{ fontSize: "2rem", marginBottom: "8px" }}>✅</div>
              <p style={{ fontSize: "0.875rem" }}>Không có topic yếu nào!</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {weakTopics.slice(0, 5).map((t: any, i: number) => (
                <div key={i} style={{
                  padding: "12px 14px", borderRadius: "12px",
                  background: t.mastery_score < 40 ? "rgba(244,63,94,0.06)" : "rgba(245,158,11,0.06)",
                  border: `1px solid ${t.mastery_score < 40 ? "rgba(244,63,94,0.2)" : "rgba(245,158,11,0.2)"}`,
                  display: "flex", justifyContent: "space-between", alignItems: "center"
                }}>
                  <div>
                    <div style={{ fontWeight: "600", fontSize: "0.85rem", marginBottom: "2px" }}>{t.topic_name}</div>
                    <div style={{ fontSize: "0.72rem", color: t.mastery_score < 40 ? "#fb7185" : "#fbbf24" }}>
                      {t.status} · {t.mastery_score?.toFixed(0)}%
                    </div>
                  </div>
                  <Link href="/review" className="btn-ghost" style={{ fontSize: "0.72rem", padding: "4px 10px" }}>
                    Ôn →
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Links */}
      <div className="glass-panel" style={{ padding: "24px" }}>
        <h2 style={{ fontSize: "1.05rem", fontWeight: "700", marginBottom: "16px" }}>Truy cập nhanh</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
          {[
            { href: "/books", icon: <BookOpen size={20} />, label: "Thư viện sách", color: "#818cf8" },
            { href: "/review", icon: <RefreshCw size={20} />, label: "Ôn tập (FSRS)", color: "#34d399" },
            { href: "/flashcards", icon: <CreditCard size={20} />, label: "Flashcards", color: "#a78bfa" },
            { href: "/tutor", icon: <MessageSquare size={20} />, label: "AI Tutor", color: "#38bdf8" },
          ].map(item => (
            <Link key={item.href} href={item.href} style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: "8px",
              padding: "16px", borderRadius: "14px", textDecoration: "none",
              background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-subtle)",
              color: item.color, transition: "all 0.2s ease"
            }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
              onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
            >
              {item.icon}
              <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", textAlign: "center" }}>
                {item.label}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
