"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { RefreshCw, Play, ShieldCheck, Loader2 } from "lucide-react";

const API = "http://localhost:8000/api/v1";

export default function ReviewQueuePage() {
  const [reviewItems, setReviewItems] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState<string | null>(null);

  useEffect(() => { fetchQueue(); }, []);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const [queueRes, statsRes] = await Promise.all([
        fetch(`${API}/reviews/queue`),
        fetch(`${API}/reviews/stats`)
      ]);
      if (queueRes.ok) { const d = await queueRes.json(); setReviewItems(d.review_items || []); }
      if (statsRes.ok) setStats(await statsRes.json());
    } catch {
      // fallback
      setReviewItems([
        { topic_id: "topic-3", topic_name: "Attention Mechanism", mastery_score: 45, retention_score: 62, urgency: "High", scheduled_for: "Đã đến hạn", recommended_action: "Adaptive Review Quiz" },
        { topic_id: "topic-4", topic_name: "Self-Attention", mastery_score: 70, retention_score: 78, urgency: "Medium", scheduled_for: "Trong ngày", recommended_action: "Flashcards" },
      ]);
    }
    setLoading(false);
  };

  const completeReview = async (topicId: string, rating: number) => {
    setCompleting(topicId);
    try {
      await fetch(`${API}/reviews/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic_id: topicId, rating })
      });
      setReviewItems(prev => prev.filter(r => r.topic_id !== topicId));
    } catch {}
    setCompleting(null);
  };

  const urgencyConfig: Record<string, { badge: string; color: string }> = {
    High:   { badge: "badge-rose",    color: "var(--accent-rose)"    },
    Medium: { badge: "badge-amber",   color: "var(--accent-amber)"   },
    Low:    { badge: "badge-emerald", color: "var(--accent-emerald)" },
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px", maxWidth: "860px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <span className="badge badge-emerald" style={{ marginBottom: "10px" }}>
            <RefreshCw size={13} /> FSRS Spaced Repetition
          </span>
          <h1 style={{ fontSize: "2rem", fontWeight: "800", fontFamily: "Outfit, sans-serif" }}>
            Hàng đợi ôn tập
          </h1>
          <p style={{ color: "var(--text-secondary)", marginTop: "4px" }}>
            Thuật toán FSRS dự đoán thời điểm sắp quên và lên lịch ôn tập tối ưu
          </p>
        </div>

        <div style={{ display: "flex", gap: "12px" }}>
          {stats && (
            <div className="glass-panel" style={{ padding: "14px 20px", textAlign: "center" }}>
              <ShieldCheck size={22} color="#10b981" style={{ margin: "0 auto 4px" }} />
              <div style={{ fontSize: "1.3rem", fontWeight: "800", color: "#34d399", fontFamily: "Outfit, sans-serif" }}>
                {stats.avg_retention?.toFixed(1)}%
              </div>
              <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontWeight: 600 }}>GHI NHỚ TB</div>
            </div>
          )}
          <div className="glass-panel" style={{ padding: "14px 20px", textAlign: "center" }}>
            <div style={{ fontSize: "1.5rem", marginBottom: "4px" }}>📚</div>
            <div style={{ fontSize: "1.3rem", fontWeight: "800", color: "#fbbf24", fontFamily: "Outfit, sans-serif" }}>
              {reviewItems.length}
            </div>
            <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontWeight: 600 }}>ĐẾN HẠN</div>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 100, borderRadius: 16 }} />)}
        </div>
      ) : reviewItems.length === 0 ? (
        <div className="glass-panel" style={{ padding: "60px", textAlign: "center" }}>
          <div style={{ fontSize: "3.5rem", marginBottom: "16px" }}>🎉</div>
          <h2 style={{ fontSize: "1.4rem", fontWeight: "700", marginBottom: "8px" }}>Tuyệt vời!</h2>
          <p style={{ color: "var(--text-secondary)", marginBottom: "24px" }}>Không có gì cần ôn tập hôm nay. Quay lại sau!</p>
          <Link href="/" className="btn-secondary">← Về trang chính</Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {reviewItems.map((item: any, idx: number) => {
            const { badge, color } = urgencyConfig[item.urgency] || urgencyConfig.Low;
            const isCompleting = completing === item.topic_id;

            return (
              <div key={idx} className="glass-panel fade-in-up" style={{ padding: "20px 24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                      <h3 style={{ fontWeight: "700", fontSize: "1.05rem" }}>{item.topic_name}</h3>
                      <span className={`badge ${badge}`}>{item.scheduled_for}</span>
                    </div>

                    <div style={{ display: "flex", gap: "20px", fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "10px" }}>
                      <span>Mastery: <strong style={{ color: "var(--text-primary)" }}>{item.mastery_score?.toFixed(1)}%</strong></span>
                      <span>Ghi nhớ: <strong style={{ color: "var(--text-primary)" }}>{item.retention_score?.toFixed(1)}%</strong></span>
                    </div>

                    <div className="progress-bar-bg" style={{ maxWidth: "320px" }}>
                      <div className="progress-bar-fill" style={{ width: `${item.retention_score}%`, background: color }} />
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", flexShrink: 0 }}>
                    <Link href={`/quiz/${item.topic_id}`} className="btn-primary">
                      <Play size={15} /> Quiz ngay
                    </Link>
                    <div style={{ display: "flex", gap: "6px" }}>
                      {[3, 4].map(rating => (
                        <button key={rating} onClick={() => completeReview(item.topic_id, rating)}
                          disabled={isCompleting}
                          style={{
                            flex: 1, padding: "6px 10px", borderRadius: "8px", border: "1px solid",
                            fontSize: "0.72rem", fontWeight: 600, cursor: "pointer",
                            borderColor: rating === 4 ? "rgba(16,185,129,0.3)" : "rgba(99,102,241,0.3)",
                            background: rating === 4 ? "rgba(16,185,129,0.08)" : "rgba(99,102,241,0.08)",
                            color: rating === 4 ? "#34d399" : "#818cf8",
                          }}>
                          {isCompleting ? <Loader2 size={12} className="spin" /> : rating === 4 ? "✓ Nhớ tốt" : "✓ Nhớ được"}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* How FSRS works */}
      <div className="glass-panel" style={{ padding: "20px 24px", background: "rgba(16,185,129,0.04)", borderColor: "rgba(16,185,129,0.15)" }}>
        <h3 style={{ fontWeight: "700", fontSize: "0.9rem", marginBottom: "10px", color: "#34d399" }}>
          ⚙️ Cách thuật toán FSRS hoạt động
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
          {[
            { icon: "🧠", title: "Stability (S)", desc: "Độ bền của ký ức — tăng khi trả lời đúng" },
            { icon: "📉", title: "Forgetting Curve", desc: "Dự đoán khi nào bạn sắp quên để ôn đúng lúc" },
            { icon: "⏰", title: "Optimal Interval", desc: "Lên lịch ôn tập tại thời điểm tối ưu nhất" },
          ].map(item => (
            <div key={item.title} style={{ padding: "12px", borderRadius: "10px", background: "rgba(16,185,129,0.06)" }}>
              <div style={{ fontSize: "1.2rem", marginBottom: "6px" }}>{item.icon}</div>
              <div style={{ fontSize: "0.8rem", fontWeight: 700, marginBottom: "4px" }}>{item.title}</div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{item.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
