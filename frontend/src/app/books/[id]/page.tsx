"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { BookOpen, Loader2, Target, Brain, ArrowRight, CheckCircle2, Lock, Play, Map, MessageSquare } from "lucide-react";

const API = "http://localhost:8000/api/v1";

const difficultyColor = (d: number) =>
  d <= 1 ? "#10b981" : d <= 2 ? "#38bdf8" : d <= 3 ? "#6366f1" : d <= 4 ? "#f59e0b" : "#f43f5e";

export default function BookDetailPage() {
  const params = useParams();
  const bookId = params.id as string;
  const [book, setBook] = useState<any>(null);
  const [topics, setTopics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [settingGoal, setSettingGoal] = useState(false);
  const [goalData, setGoalData] = useState({ goal_description: "Học hiểu toàn bộ nội dung sách", daily_minutes: 45, deadline_days: 30 });
  const [goalResult, setGoalResult] = useState<any>(null);
  const [goalLoading, setGoalLoading] = useState(false);

  useEffect(() => {
    if (bookId) fetchBookData();
  }, [bookId]);

  const fetchBookData = async () => {
    try {
      const [statusRes, topicsRes] = await Promise.all([
        fetch(`${API}/documents/${bookId}/status`),
        fetch(`${API}/documents/${bookId}/topics`)
      ]);
      if (statusRes.ok) setBook(await statusRes.json());
      if (topicsRes.ok) {
        const data = await topicsRes.json();
        setTopics(data.topics || []);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleSetGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    setGoalLoading(true);
    try {
      const res = await fetch(`${API}/learning-paths/set-goal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document_id: bookId, ...goalData })
      });
      const data = await res.json();
      if (res.ok) {
        setGoalResult(data);
        setSettingGoal(false);
      }
    } catch { /* ignore */ }
    setGoalLoading(false);
  };

  if (loading) return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px", maxWidth: "860px" }}>
      <div className="skeleton" style={{ height: 120, borderRadius: 20 }} />
      <div className="skeleton" style={{ height: 300, borderRadius: 20 }} />
    </div>
  );

  if (!book) return (
    <div className="glass-panel" style={{ padding: 40, textAlign: "center" }}>
      <p style={{ color: "var(--text-secondary)" }}>Không tìm thấy tài liệu này.</p>
      <Link href="/books" className="btn-secondary" style={{ marginTop: 16, display: "inline-flex" }}>← Quay lại</Link>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px", maxWidth: "860px" }}>
      {/* Book Header */}
      <div className="glass-panel fade-in-up" style={{ padding: "28px 32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "20px" }}>
          <div style={{ flex: 1 }}>
            <Link href="/books" className="btn-ghost" style={{ marginBottom: "12px", padding: "4px 0" }}>
              ← Thư viện
            </Link>
            <h1 style={{ fontSize: "1.8rem", fontWeight: "800", fontFamily: "Outfit, sans-serif", marginBottom: "10px", lineHeight: 1.2 }}>
              {book.title}
            </h1>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
              <span className="badge badge-emerald">
                <CheckCircle2 size={12} /> {book.processing_status === "completed" ? "Đã xử lý" : "Đang xử lý"}
              </span>
              <span className="badge badge-indigo">{book.chunk_count} vector chunks</span>
              <span className="badge badge-purple">{book.topic_count} topics</span>
              {book.file_path && (
                <a href={book.file_path} target="_blank" rel="noreferrer" className="badge badge-cyan" style={{ textDecoration: "none" }}>
                  📄 PDF gốc (Supabase Storage) ↗
                </a>
              )}
            </div>
          </div>
          <div style={{ fontSize: "4rem", flexShrink: 0 }}>📘</div>
        </div>
      </div>

      {/* Goal Result */}
      {goalResult && (
        <div className="glass-panel fade-in-up" style={{ padding: "24px", background: "rgba(16,185,129,0.05)", borderColor: "rgba(16,185,129,0.2)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#34d399", fontWeight: 700, marginBottom: "8px" }}>
            <CheckCircle2 size={20} /> Đã tạo lịch học thành công!
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "16px" }}>
            {goalResult.plan_days} ngày học được lên kế hoạch • Deadline: {goalResult.deadline_date}
          </p>
          <div style={{ display: "flex", gap: "10px" }}>
            <Link href="/" className="btn-primary">
              <Map size={16} /> Xem lịch học hôm nay
            </Link>
            <Link href="/plan" className="btn-secondary">
              Xem toàn bộ lịch học
            </Link>
          </div>
        </div>
      )}

      {/* Set Goal CTA */}
      {!goalResult && book.processing_status === "completed" && (
        <div className="glass-panel fade-in-up" style={{ padding: "24px 28px", background: "rgba(99,102,241,0.05)", borderColor: "rgba(99,102,241,0.2)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h3 style={{ fontSize: "1.1rem", fontWeight: "700", marginBottom: "4px" }}>
                🎯 Đặt mục tiêu học tập
              </h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                AI sẽ tạo lịch học cá nhân hóa dựa trên mục tiêu của bạn
              </p>
            </div>
            <button className="btn-primary" onClick={() => setSettingGoal(true)}>
              Bắt đầu <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Goal Setup Form */}
      {settingGoal && (
        <div className="glass-panel fade-in-up" style={{ padding: "28px" }}>
          <h3 style={{ fontSize: "1.15rem", fontWeight: "700", marginBottom: "20px" }}>
            🎯 Thiết lập mục tiêu học tập
          </h3>
          <form onSubmit={handleSetGoal} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label className="label-text">Mục tiêu của bạn là gì?</label>
              <input className="input-field" value={goalData.goal_description}
                onChange={e => setGoalData(p => ({ ...p, goal_description: e.target.value }))}
                placeholder="Ví dụ: Chuẩn bị phỏng vấn Backend Developer" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div>
                <label className="label-text">Thời gian học mỗi ngày (phút)</label>
                <input className="input-field" type="number" min={15} max={180} value={goalData.daily_minutes}
                  onChange={e => setGoalData(p => ({ ...p, daily_minutes: parseInt(e.target.value) }))} />
              </div>
              <div>
                <label className="label-text">Hoàn thành trong (ngày)</label>
                <input className="input-field" type="number" min={7} max={90} value={goalData.deadline_days}
                  onChange={e => setGoalData(p => ({ ...p, deadline_days: parseInt(e.target.value) }))} />
              </div>
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button type="submit" className="btn-primary" disabled={goalLoading}>
                {goalLoading ? <><Loader2 size={16} className="spin" /> Đang tạo...</> : <>🤖 Tạo lịch học AI</>}
              </button>
              <button type="button" className="btn-secondary" onClick={() => setSettingGoal(false)}>Hủy</button>
            </div>
          </form>
        </div>
      )}

      {/* Topics Grid */}
      <div className="glass-panel fade-in-up" style={{ padding: "24px 28px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h2 style={{ fontSize: "1.15rem", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px" }}>
            <Brain size={18} color="var(--accent-purple)" />
            Knowledge Graph — {topics.length} topics
          </h2>
          <Link href={`/knowledge-graph?document_id=${bookId}`} className="btn-ghost">
            Xem đồ thị →
          </Link>
        </div>

        {topics.length === 0 ? (
          <div style={{ textAlign: "center", padding: "32px", color: "var(--text-muted)" }}>
            {book.processing_status === "processing"
              ? <><Loader2 size={20} className="spin" style={{ marginBottom: 8 }} /><br />AI đang bóc tách topics...</>
              : "Chưa có topics nào"}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px" }}>
            {topics.map((topic: any, idx: number) => (
              <div key={topic.id} style={{
                padding: "16px", borderRadius: "14px",
                border: `1px solid rgba(99,102,241,0.15)`,
                background: "rgba(99,102,241,0.04)",
                display: "flex", flexDirection: "column", gap: "8px"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <h3 style={{ fontWeight: "600", fontSize: "0.9rem", lineHeight: 1.3 }}>{topic.name}</h3>
                  <span style={{
                    fontSize: "0.7rem", fontWeight: 700, padding: "3px 8px", borderRadius: "6px",
                    background: `${difficultyColor(topic.difficulty_level)}20`,
                    color: difficultyColor(topic.difficulty_level), flexShrink: 0
                  }}>Lv.{topic.difficulty_level}</span>
                </div>
                {topic.description && (
                  <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", lineHeight: 1.5 }}>{topic.description}</p>
                )}
                <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                  <Link href={`/lesson/${topic.id}?doc=${bookId}`} className="btn-ghost" style={{ fontSize: "0.75rem", padding: "4px 10px" }}>
                    <BookOpen size={12} /> Học
                  </Link>
                  <Link href={`/tutor?topic=${topic.id}&doc=${bookId}`} className="btn-ghost" style={{ fontSize: "0.75rem", padding: "4px 10px" }}>
                    <MessageSquare size={12} /> Hỏi AI
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
        {[
          { href: `/flashcards?doc=${bookId}`, icon: "🃏", label: "Tạo Flashcards", color: "rgba(139,92,246,0.1)", border: "rgba(139,92,246,0.25)" },
          { href: `/tutor?doc=${bookId}`, icon: "🤖", label: "Hỏi AI Tutor", color: "rgba(56,189,248,0.1)", border: "rgba(56,189,248,0.25)" },
          { href: `/knowledge-graph?document_id=${bookId}`, icon: "🕸️", label: "Knowledge Graph", color: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.25)" },
        ].map(a => (
          <Link key={a.href} href={a.href} style={{
            background: a.color, border: `1px solid ${a.border}`, borderRadius: "14px",
            padding: "18px", textDecoration: "none", color: "inherit",
            display: "flex", flexDirection: "column", gap: "6px", transition: "all 0.2s ease"
          }}
            onMouseEnter={e => (e.currentTarget.style.transform = "translateY(-2px)")}
            onMouseLeave={e => (e.currentTarget.style.transform = "none")}
          >
            <span style={{ fontSize: "1.6rem" }}>{a.icon}</span>
            <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>{a.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
