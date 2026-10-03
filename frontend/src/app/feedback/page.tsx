"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, Loader2, RefreshCw, Zap, ChevronDown, ChevronUp, BookOpen } from "lucide-react";

const API = "http://localhost:8000/api/v1";

const ERROR_TYPE_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  vocabulary: { label: "Từ vựng", color: "#818cf8", icon: "📚" },
  grammar: { label: "Ngữ pháp", color: "#fbbf24", icon: "📝" },
  comprehension: { label: "Hiểu bài", color: "#f472b6", icon: "🧠" },
  pronunciation: { label: "Phát âm", color: "#38bdf8", icon: "🎙" },
  sentence_structure: { label: "Cấu trúc câu", color: "#34d399", icon: "🔗" },
};

export default function FeedbackPage() {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [generatingExercises, setGeneratingExercises] = useState(false);
  const [remedialData, setRemedialData] = useState<any>(null);

  useEffect(() => {
    fetchReport();
  }, []);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/feedback/report?min_occurrences=1`);
      if (res.ok) {
        const data = await res.json();
        setReport(data);
      }
    } catch { /* ignore */ }
    setLoading(false);
  };

  const handleGenerateRemedial = async () => {
    if (!report?.recent_errors?.length) return;
    setGeneratingExercises(true);
    try {
      const res = await fetch(`${API}/feedback/remedial-exercises`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic_id: report.recent_errors[0]?.topic_id || "default",
          topic_name: "Ôn tập từ lỗi hay gặp",
        })
      });
      if (res.ok) {
        const data = await res.json();
        setRemedialData(data);
      }
    } catch { /* ignore */ }
    setGeneratingExercises(false);
  };

  if (loading) return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <div className="skeleton" style={{ height: 60, borderRadius: 16, marginBottom: 20 }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 24 }}>
        {[...Array(3)].map((_, i) => <div key={i} className="skeleton" style={{ height: 90, borderRadius: 12 }} />)}
      </div>
      <div className="skeleton" style={{ height: 300, borderRadius: 16 }} />
    </div>
  );

  const analysis = report?.analysis;
  const categories = analysis?.error_categories || [];

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <span className="badge badge-amber" style={{ marginBottom: 10 }}>
          ⚠️ Feature F — Personalized Learning Feedback
        </span>
        <h1 style={{ fontSize: "2rem", fontWeight: 800, fontFamily: "Outfit, sans-serif" }}>
          Phân Tích Lỗi Học Tập
        </h1>
        <p style={{ color: "var(--text-secondary)", marginTop: 4 }}>
          Tổng hợp lỗi tái diễn từ Quiz, Roleplay và Flashcard — nhận đề xuất bài tập khắc phục
        </p>
      </div>

      {/* Summary Banner */}
      {analysis?.summary && (
        <div className="glass-panel" style={{
          padding: "20px 24px", borderRadius: 16, marginBottom: 24,
          borderLeft: "3px solid var(--accent-indigo)"
        }}>
          <div style={{ fontSize: "0.75rem", color: "var(--accent-indigo)", fontWeight: 700, marginBottom: 6 }}>
            🧠 PHÂN TÍCH AI
          </div>
          <p style={{ color: "var(--text-secondary)", lineHeight: 1.6, fontSize: "0.9rem" }}>
            {analysis.summary}
          </p>
        </div>
      )}

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 24 }}>
        {[
          { label: "Lỗi tái diễn", value: report?.total_recurring_errors || 0, color: "#f472b6" },
          { label: "Loại lỗi", value: report?.total_error_types || 0, color: "#fbbf24" },
          { label: "Đề xuất", value: analysis?.recommendations?.length || 0, color: "#818cf8" },
        ].map((s, i) => (
          <div key={i} className="glass-panel" style={{ padding: "16px", textAlign: "center" }}>
            <div style={{ fontSize: "1.8rem", fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Error Categories */}
      {categories.length > 0 && (
        <div className="glass-panel" style={{ padding: "24px", marginBottom: 20 }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 16 }}>📊 Phân Loại Lỗi</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {categories.map((cat: any, i: number) => {
              const cfg = ERROR_TYPE_CONFIG[cat.category] || { label: cat.label, color: "#818cf8", icon: "⚠" };
              const isExpanded = expandedCategory === cat.category;
              const errorsForType = (report?.recent_errors || []).filter((e: any) => e.error_type === cat.category);
              const maxCount = Math.max(...categories.map((c: any) => c.count), 1);

              return (
                <div key={i} style={{ borderRadius: 12, border: "1px solid var(--border-subtle)", overflow: "hidden" }}>
                  <button
                    onClick={() => setExpandedCategory(isExpanded ? null : cat.category)}
                    style={{
                      width: "100%", padding: "14px 16px", background: "none", border: "none",
                      cursor: "pointer", display: "flex", alignItems: "center", gap: 12
                    }}
                  >
                    <span style={{ fontSize: "1.2rem" }}>{cfg.icon}</span>
                    <div style={{ flex: 1, textAlign: "left" }}>
                      <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "0.9rem" }}>{cfg.label}</div>
                      {cat.description && (
                        <div style={{ fontSize: "0.76rem", color: "var(--text-muted)", marginTop: 2 }}>{cat.description}</div>
                      )}
                      {/* Progress bar */}
                      <div style={{ marginTop: 8, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                        <div style={{ height: "100%", borderRadius: 2, width: `${(cat.count / maxCount) * 100}%`, background: cfg.color }} />
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: "1.1rem", fontWeight: 800, color: cfg.color }}>{cat.count}</div>
                      <div style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>lần lỗi</div>
                    </div>
                    {isExpanded ? <ChevronUp size={16} color="var(--text-muted)" /> : <ChevronDown size={16} color="var(--text-muted)" />}
                  </button>

                  {isExpanded && errorsForType.length > 0 && (
                    <div style={{ borderTop: "1px solid var(--border-subtle)", padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
                      {errorsForType.slice(0, 5).map((err: any, ei: number) => (
                        <div key={ei} style={{ display: "flex", gap: 12, padding: "8px 10px", borderRadius: 8, background: "rgba(0,0,0,0.15)", fontSize: "0.8rem" }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ color: "var(--text-secondary)" }}>{err.error_detail}</div>
                            {err.user_input && (
                              <div style={{ marginTop: 4 }}>
                                <span style={{ color: "#fb7185" }}>✗ {err.user_input}</span>
                                {err.correct_form && <span style={{ color: "#34d399" }}> → ✓ {err.correct_form}</span>}
                              </div>
                            )}
                          </div>
                          <div style={{ textAlign: "right", flexShrink: 0, color: "var(--text-muted)", fontSize: "0.7rem" }}>
                            {err.occurrence_count}×<br />
                            {err.source}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {analysis?.recommendations?.length > 0 && (
        <div className="glass-panel" style={{ padding: "24px", marginBottom: 20 }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 16 }}>💡 Đề Xuất Cải Thiện</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {analysis.recommendations.map((rec: any, i: number) => (
              <div key={i} style={{
                padding: "12px 16px", borderRadius: 10,
                background: rec.priority === "high" ? "rgba(248,113,113,0.06)" : "rgba(99,102,241,0.06)",
                border: `1px solid ${rec.priority === "high" ? "rgba(248,113,133,0.2)" : "rgba(99,102,241,0.2)"}`
              }}>
                <div style={{ fontWeight: 600, fontSize: "0.88rem", marginBottom: 4 }}>{rec.title}</div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{rec.description}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Remedial Exercises Generator */}
      <div className="glass-panel" style={{ padding: "24px" }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>⚡ Bài Tập Khắc Phục</h2>
        <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: 16 }}>
          AI tự động sinh bài tập nhắm vào những lỗi hay gặp nhất của bạn
        </p>

        <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
          <button
            className="btn-primary"
            onClick={handleGenerateRemedial}
            disabled={generatingExercises || !report?.total_recurring_errors}
          >
            {generatingExercises ? <Loader2 size={16} className="spin" /> : <Zap size={16} />}
            {generatingExercises ? "Đang sinh bài tập..." : "Sinh Bài Tập Khắc Phục"}
          </button>
          <button className="btn-secondary" onClick={fetchReport}>
            <RefreshCw size={16} /> Làm mới
          </button>
          <a href="/vocabulary" className="btn-secondary">
            <BookOpen size={16} /> Xem Từ Vựng
          </a>
        </div>

        {remedialData?.exercises?.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: 4 }}>
              Đã sinh {remedialData.exercises.length} bài tập cho "{remedialData.topic_name}"
            </div>
            {remedialData.exercises.map((ex: any, i: number) => (
              <div key={i} style={{
                padding: "16px", borderRadius: 12,
                background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.2)"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span className="badge badge-indigo" style={{ fontSize: "0.65rem" }}>{ex.exercise_type}</span>
                  {ex.target_error && <span className="badge badge-amber" style={{ fontSize: "0.65rem" }}>→ {ex.target_error}</span>}
                </div>
                <div style={{ fontWeight: 600, marginBottom: 8, fontSize: "0.9rem" }}>{ex.question_text}</div>
                {ex.correct_answer && (
                  <div style={{ fontSize: "0.82rem", color: "#34d399" }}>✓ {ex.correct_answer}</div>
                )}
                {ex.explanation && (
                  <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: 6 }}>💡 {ex.explanation}</div>
                )}
              </div>
            ))}
          </div>
        )}

        {report?.total_recurring_errors === 0 && (
          <div style={{ textAlign: "center", padding: "20px", color: "var(--text-muted)", fontSize: "0.85rem" }}>
            🎉 Tuyệt vời! Chưa có lỗi nào được ghi nhận. Hãy tiếp tục học để hệ thống theo dõi tiến độ.
          </div>
        )}
      </div>
    </div>
  );
}
